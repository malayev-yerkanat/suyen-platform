import { expect, test } from '@playwright/test';
import { translate } from '../../lib/i18n/catalog';

test.skip(process.env.TEST_DEMO_EMAIL !== 'fixture@suyen.example', 'Requires isolated fixture config');
for (const locale of ['ru', 'kk'] as const) {
  test(`${locale}: compact navigation, slot grouping and keyboard feedback`, async ({ page, request }) => {
    await request.post('http://127.0.0.1:54329/__fixture/reset');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/demo/login');
    await page.getByRole('button', { name: locale === 'ru' ? 'RU' : 'ҚАЗ', exact: true }).click();
    await page.getByLabel(translate(locale, 'auth.email')).fill('fixture@suyen.example');
    await page.getByLabel(translate(locale, 'auth.password')).fill('fixture-password');
    await page.getByRole('button', { name: translate(locale, 'auth.submit'), exact: true }).click();
    await expect(page).toHaveURL(/\/demo$/);
    const toggle = page.locator('.demo-navigation__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.demo-navigation__panel').getByRole('link', { name: translate(locale, 'nav.specialists'), exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await page.locator('.demo-navigation__panel').getByRole('link', { name: translate(locale, 'nav.specialists'), exact: true }).click();
    await expect(page.getByRole('heading', { name: translate(locale, 'directory.title'), exact: true })).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.locator('main a[href="/demo/specialists/30000000-0000-4000-8000-000000000001"]').first().click();
    await expect(page.locator('.slot-list a')).toHaveCount(6);
    await expect(page.locator('.demo-navigation__panel a[href="/demo/specialists"]')).toHaveAttribute('aria-current', 'location');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.screenshot({ path: `test-results/ui-refinements/${locale}-mobile-specialist.png`, fullPage: true });
    await page.goto('/demo/feedback?from=dashboard');
    await page.locator('#feedback-outcome').selectOption('yes');
    await page.locator('#feedback-ease').selectOption('5');
    await page.locator('#feedback-difficulty').selectOption('none');
    await page.setViewportSize({ width: 1440, height: 900 });
    const sizes = await page.locator('main select').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/ui-refinements/${locale}-desktop-feedback.png`, fullPage: true });
    await page.getByRole('button', { name: translate(locale, 'feedback.submit') }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: translate(locale, 'feedback.thanks') })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: translate(locale, 'feedback.back') })).toBeFocused();
  });
}
