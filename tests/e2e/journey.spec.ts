import { expect, test, type Page } from '@playwright/test';

import { translate, type Locale } from '../../lib/i18n/catalog';

type ProfileValues = {
  nickname: string;
  ageBand: string;
  preferredLanguage: string;
  supportArea: string;
};

const credentialsAvailable = Boolean(process.env.TEST_DEMO_EMAIL && process.env.TEST_DEMO_PASSWORD);

// All four runs edit the same synthetic account, so they must not overlap.
test.describe.configure({ mode: 'serial' });

async function profileValues(page: Page): Promise<ProfileValues> {
  return {
    nickname: await page.locator('#profile-nickname').inputValue(),
    ageBand: await page.locator('#profile-age').inputValue(),
    preferredLanguage: await page.locator('#profile-language').inputValue(),
    supportArea: await page.locator('#profile-support').inputValue(),
  };
}

async function saveProfile(page: Page, values: ProfileValues, locale: Locale) {
  await page.locator('#profile-nickname').fill(values.nickname);
  await page.locator('#profile-age').selectOption(values.ageBand);
  await page.locator('#profile-language').selectOption(values.preferredLanguage);
  await page.locator('#profile-support').selectOption(values.supportArea);
  await page.getByRole('button', { name: translate(locale, 'profile.save') }).click();
  await expect(page.getByRole('status')).toContainText(translate(locale, 'profile.saved'));
}

async function cancelIfConfirmed(page: Page, bookingUrl: string, locale: Locale) {
  await page.goto(bookingUrl);
  if (await page.getByRole('heading', { name: translate(locale, 'booking.cancelled') }).isVisible()) return;
  await page.locator('.booking-cancel summary').click();
  await page.getByRole('button', { name: translate(locale, 'common.yes') }).click();
  await expect(page.getByRole('heading', { name: translate(locale, 'booking.cancelled') })).toBeVisible();
}

for (const locale of ['ru', 'kk'] as const) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
  ]) {
    test(`${locale} ${viewport.name}: profile, filters, booking and cancellation`, async ({ page }) => {
      test.setTimeout(120_000);
      test.skip(!credentialsAvailable, 'Demo credentials unavailable');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      let originalProfile: ProfileValues | null = null;
      let bookingUrl: string | null = null;
      let chosenSlotId: string | null = null;
      let profileChanged = false;
      let nickname = '';

      try {
        await page.goto('/demo/login?next=%2Fdemo%2Fprofile');
        await page.getByRole('button', { name: locale === 'ru' ? 'RU' : 'ҚАЗ' }).click();
        await expect(page.getByRole('heading', { name: translate(locale, 'auth.title') })).toBeVisible();
        await page.getByRole('textbox', { name: translate(locale, 'auth.email') })
          .fill(process.env.TEST_DEMO_EMAIL!);
        await page.getByLabel(translate(locale, 'auth.password')).fill(process.env.TEST_DEMO_PASSWORD!);
        await page.getByRole('button', { name: translate(locale, 'auth.submit') }).click();
        await expect(page).toHaveURL(/\/demo\/profile$/);

        originalProfile = await profileValues(page);
        nickname = `E2E-${locale}-${viewport.name}-${Date.now().toString(36)}`;
        const testProfile: ProfileValues = {
          nickname,
          ageBand: '4_6',
          preferredLanguage: locale,
          supportArea: 'speech_language',
        };
        profileChanged = true;
        await saveProfile(page, testProfile, locale);
        await page.reload();
        await expect(page.locator('#profile-nickname')).toHaveValue(nickname);

        const editedNickname = `${nickname}-edited`;
        await saveProfile(page, { ...testProfile, nickname: editedNickname }, locale);
        await page.reload();
        await expect(page.locator('#profile-nickname')).toHaveValue(editedNickname);

        await page.goto('/demo/specialists');
        await expect(page.getByRole('heading', { name: translate(locale, 'directory.title') })).toBeVisible();
        await page.getByLabel(translate(locale, 'directory.filter.area')).selectOption('speech_language');
        await page.getByLabel(translate(locale, 'directory.filter.language')).selectOption(locale);
        await page.getByLabel(translate(locale, 'directory.filter.available')).check();
        await page.getByRole('button', { name: translate(locale, 'directory.filter.apply') }).click();
        await expect(page).toHaveURL(/area=speech_language/);
        await expect(page.locator('.specialist-card').first()).toBeVisible();

        const slotLink = page.locator('.specialist-card .slot-list a').first();
        await expect(slotLink).toBeVisible();
        chosenSlotId = new URL((await slotLink.getAttribute('href'))!, page.url()).searchParams.get('slot');
        expect(chosenSlotId).not.toBeNull();
        await slotLink.click();
        await expect(page.getByRole('heading', { name: translate(locale, 'booking.reviewTitle') })).toBeVisible();
        await expect(page.locator('.booking-summary')).toContainText(editedNickname);
        await page.getByRole('button', { name: translate(locale, 'booking.confirm') }).click();
        await expect(page).toHaveURL(/\/demo\/bookings\/[0-9a-f-]{36}$/);
        bookingUrl = page.url();
        await expect(page.getByRole('heading', { name: translate(locale, 'booking.confirmed') })).toBeVisible();
        await expect(page.locator('.booking-summary')).toContainText(editedNickname);

        await cancelIfConfirmed(page, bookingUrl, locale);
        bookingUrl = null;
        await page.goto('/demo/specialists?area=speech_language&language=' + locale + '&available=1');
        await expect(page.locator(`.slot-list a[href*="${chosenSlotId}"]`)).toBeVisible();
      } finally {
        // The account is shared. Release any slot this run reserved, even after an assertion fails.
        if (!bookingUrl && /\/demo\/bookings\/[0-9a-f-]{36}$/.test(page.url())) {
          bookingUrl = page.url();
        }
        try {
          if (bookingUrl) await cancelIfConfirmed(page, bookingUrl, locale);
        } finally {
          // Preserve an existing profile only if our test still owns its nickname.
          // A newly created synthetic profile remains because the UI has no delete action.
          if (profileChanged && originalProfile?.nickname) {
            await page.goto('/demo/profile');
            const current = await profileValues(page);
            if (current.nickname.startsWith(nickname)) {
              await saveProfile(page, originalProfile, locale);
            }
          }
        }
      }
    });
  }
}
