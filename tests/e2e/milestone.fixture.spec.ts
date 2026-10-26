import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { translate, type Locale } from '../../lib/i18n/catalog';

const fixtureURL = 'http://127.0.0.1:54329';
const specialistId = '30000000-0000-4000-8000-000000000001';
test.skip(process.env.TEST_DEMO_EMAIL !== 'fixture@suyen.example', 'Requires isolated fixture config');
test.describe.configure({ mode: 'serial' });

async function login(page: Page, locale: Locale) {
  await page.goto('/demo/login');
  await page.getByRole('button', { name: locale === 'ru' ? 'RU' : 'ҚАЗ', exact: true }).click();
  await page.getByLabel(translate(locale, 'auth.email')).fill('fixture@suyen.example');
  await page.getByLabel(translate(locale, 'auth.password')).fill('fixture-password');
  await page.getByRole('button', { name: translate(locale, 'auth.submit') }).click();
  await expect(page).toHaveURL(/\/demo$/);
}

for (const locale of ['ru', 'kk'] as const) {
  for (const width of [1440, 375]) {
    test(`${locale} ${width}: specialist details, history, structured feedback`, async ({ page, request }) => {
      await request.post(`${fixtureURL}/__fixture/reset`);
      await page.setViewportSize({ width, height: 900 });
      await login(page, locale);
      await mkdir('test-results/milestone-review', { recursive: true });
      await page.goto('/demo/specialists');
      const card = page.locator('.specialist-card').filter({ hasText: 'Демо специалист' });
      await expect(card.locator('.slot-list a')).toHaveCount(3);
      await card.locator(`a[href="/demo/specialists/${specialistId}"]`).click();
      await expect(page.getByRole('heading', { name: 'Демо специалист', exact: true })).toBeVisible();
      await expect(page.locator('.slot-list a')).toHaveCount(6);
      await expect(page.locator('main')).toContainText('50');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/milestone-review/${locale}-${width}-specialist.png`, fullPage: true });
      await page.locator('.slot-list a').first().click();
      await page.getByRole('button', { name: translate(locale, 'booking.confirm') }).click();
      await expect(page.getByRole('heading', { name: translate(locale, 'booking.confirmed') })).toBeVisible();
      const bookingURL = page.url();
      await page.reload();
      await expect(page.getByRole('heading', { name: translate(locale, 'booking.confirmed') })).toBeVisible();
      await page.goto('/demo/bookings');
      await expect(page.locator('.appointment-card')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/milestone-review/${locale}-${width}-history.png`, fullPage: true });
      await page.goto(bookingURL);
      await page.locator('.booking-cancel summary').click();
      await page.locator('.booking-cancel form').getByRole('button', { name: translate(locale, 'booking.cancel'), exact: true }).click();
      await expect(page.getByRole('heading', { name: translate(locale, 'booking.cancelled') })).toBeVisible();
      await page.goto('/demo/bookings?view=cancelled');
      await expect(page.locator('.appointment-card')).toHaveCount(1);
      await page.goto('/demo/bookings?view=upcoming');
      await expect(page.locator('.appointment-card')).toHaveCount(0);
      await page.goto('/demo/bookings?view=past');
      await expect(page.locator('.appointments-note')).toHaveText(translate(locale, 'appointments.pastNote'));
      await page.goto('/demo/feedback?from=cancellation');
      await expect(page.locator('textarea, input:not([type="hidden"])')).toHaveCount(0);
      await page.locator('#feedback-outcome').selectOption('yes');
      await page.locator('#feedback-ease').selectOption('5');
      await page.locator('#feedback-difficulty').selectOption('none');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/milestone-review/${locale}-${width}-feedback.png`, fullPage: true });
      await page.locator('#feedback-outcome').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#feedback-ease')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#feedback-difficulty')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: translate(locale, 'feedback.submit') })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('status')).toContainText(translate(locale, 'feedback.thanks'));
      const state = await (await request.get(`${fixtureURL}/__fixture/state`)).json();
      expect(state.demo_feedback).toHaveLength(1);
      expect(state.demo_feedback[0]).toMatchObject({ outcome: 'yes', ease: 5, difficulty: 'none', entry_point: 'cancellation' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}

test('empty/missing specialists and feedback outage have recovery paths', async ({ page, request }) => {
  await request.post(`${fixtureURL}/__fixture/reset`);
  await login(page, 'ru');
  await page.goto('/demo/specialists/30000000-0000-4000-8000-000000000002');
  await expect(page.locator('.slot-list a')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(translate('ru', 'directory.noSlots'));
  await page.goto('/demo/specialists/30000000-0000-4000-8000-000000000099');
  await expect(page.locator('main a[href="/demo/specialists"]')).toBeVisible();
  await page.goto('/demo/feedback');
  await page.locator('#feedback-outcome').selectOption('partially');
  await page.locator('#feedback-ease').selectOption('2');
  await page.locator('#feedback-difficulty').selectOption('choosing_time');
  await request.post(`${fixtureURL}/__fixture/feedback-failure`, { data: { enabled: true } });
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(translate('ru', 'feedback.error'));
  await expect(page.locator('#feedback-ease')).toHaveValue('2');
  await request.post(`${fixtureURL}/__fixture/feedback-failure`, { data: { enabled: false } });
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.getByRole('status')).toContainText(translate('ru', 'feedback.thanks'));
});

test('past appointments remain distinct and retry after a lost save response creates one feedback row', async ({ page, request }) => {
  await request.post(`${fixtureURL}/__fixture/reset`);
  await request.post(`${fixtureURL}/__fixture/past-booking`);
  await login(page, 'ru');
  await page.goto('/demo/bookings?view=past');
  await expect(page.locator('.appointment-card')).toHaveCount(1);
  await page.locator('.appointment-card a').first().click();
  await expect(page.locator('.booking-cancel')).toHaveCount(0);
  await page.goto('/demo/bookings?view=upcoming');
  await expect(page.locator('.appointment-card')).toHaveCount(0);
  await page.goto('/demo/feedback');
  await page.locator('#feedback-outcome').selectOption('yes');
  await page.locator('#feedback-ease').selectOption('4');
  await page.locator('#feedback-difficulty').selectOption('none');
  await request.post(`${fixtureURL}/__fixture/lose-feedback-response`);
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.getByRole('status')).toContainText(translate('ru', 'feedback.thanks'));
  const state = await (await request.get(`${fixtureURL}/__fixture/state`)).json();
  expect(state.demo_feedback).toHaveLength(1);
});


test('changed answers after lost save response show conflict without duplicate feedback', async ({ page, request }) => {
  await request.post(`${fixtureURL}/__fixture/reset`);
  await login(page, 'ru');
  await page.goto('/demo/feedback');
  await page.locator('#feedback-outcome').selectOption('yes');
  await page.locator('#feedback-ease').selectOption('4');
  await page.locator('#feedback-difficulty').selectOption('none');
  await request.post(`${fixtureURL}/__fixture/lose-feedback-response`);
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await page.locator('#feedback-ease').selectOption('2');
  await page.getByRole('button', { name: translate('ru', 'feedback.submit') }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(translate('ru', 'feedback.conflict'));
  const state = await (await request.get(`${fixtureURL}/__fixture/state`)).json();
  expect(state.demo_feedback).toHaveLength(1);
  expect(state.demo_feedback[0].ease).toBe(4);
});
