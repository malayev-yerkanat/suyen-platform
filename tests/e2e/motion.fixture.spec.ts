import { expect, test } from '@playwright/test';

test.skip(process.env.TEST_DEMO_EMAIL !== 'fixture@suyen.example', 'Requires isolated fixture config');

test('reduced motion keeps content visible and suppresses spatial animation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#public-title')).toBeVisible();
  await expect(page.locator('[data-motion="item"]').first()).toHaveCSS('transform', 'none');
  await page.goto('/demo/login');
  await page.getByLabel('Электронная почта').fill('fixture@suyen.example');
  await page.getByLabel('Пароль').fill('fixture-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.demo-navigation__toggle').click();
  await expect(page.locator('.demo-navigation__panel')).toBeVisible();
  await expect(page.locator('.demo-navigation__panel')).toHaveCSS('transform', 'none');
  await page.goto('/demo/feedback');
  const button = page.getByRole('button', { name: 'Отправить отзыв' });
  await button.hover();
  await expect(button).toHaveCSS('transform', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await button.hover();
  await expect(button).not.toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(button).toHaveCSS('transform', 'none');
});

test('motion surfaces settle visibly without hydration errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-motion="item"]').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('#public-title')).toBeVisible();
  expect(errors).toEqual([]);
});

test('public content remains visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3107/');
    await expect(page.locator('#public-title')).toBeVisible();
    await expect(page.locator('[data-motion="item"]').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('.public-hero__cta[href="/demo/login"]')).toBeVisible();
  } finally { await context.close(); }
});
