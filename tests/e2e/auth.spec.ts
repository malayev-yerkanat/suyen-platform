import { expect, test } from '@playwright/test';

test('private profile redirects to the sign-in form', async ({ page }) => {
  await page.goto('/demo/profile');
  await expect(page).toHaveURL(/\/demo\/login\?next=%2Fdemo%2Fprofile/);
  await expect(page.getByRole('textbox', { name: /email|электрон|пошта/i })).toBeVisible();
});

test('invalid credentials show a usable error', async ({ page }) => {
  await page.goto('/demo/login');
  const submit = page.getByRole('button', { name: /sign in|войти|кіру/i });
  test.skip(await submit.isDisabled(), 'Supabase is not configured');
  await page.getByRole('textbox', { name: /email|электрон|пошта/i }).fill('wrong@example.invalid');
  await page.getByLabel(/password|пароль|құпиясөз/i).fill('incorrect-password');
  await submit.click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('login errors use the error color', async ({ page }) => {
  await page.goto('/demo/login?error=invalid');
  test.skip(await page.getByRole('button', { name: /sign in|войти|кіру/i }).isDisabled(), 'Supabase is not configured');

  const alert = page.locator('.auth-error');
  await expect(alert).toBeVisible();
  const colors = await alert.evaluate((element) => ({
    actual: getComputedStyle(element).color,
    expected: getComputedStyle(document.documentElement).getPropertyValue('--error').trim(),
  }));
  expect(colors.actual).toBe('rgb(180, 35, 24)');
  expect(colors.expected).toBe('#b42318');
});

test('sign-in and sign-out protect the route', async ({ page }) => {
  test.skip(!process.env.TEST_DEMO_EMAIL || !process.env.TEST_DEMO_PASSWORD, 'Demo credentials unavailable');
  await page.goto('/demo/login?next=%2Fdemo%2Fprofile');
  await page.getByRole('textbox', { name: /email|электрон|пошта/i }).fill(process.env.TEST_DEMO_EMAIL!);
  await page.getByLabel(/password|пароль|құпиясөз/i).fill(process.env.TEST_DEMO_PASSWORD!);
  await page.getByRole('button', { name: /sign in|войти|кіру/i }).click();
  await expect(page).toHaveURL(/\/demo\/profile/);
  await page.goto('/demo');
  const dashboardCard = page.locator('.dashboard-card').first();
  await expect(dashboardCard).toBeVisible();
  await expect(dashboardCard).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const signOut = page.getByRole('button', { name: /sign out|выйти|шығу/i });
  const signOutRadius = await signOut.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius));
  expect(signOutRadius).toBeGreaterThanOrEqual(20);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(dashboardCard).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await signOut.click();
  await expect(page).toHaveURL(/\/demo\/login/);
  await page.goto('/demo/profile');
  await expect(page).toHaveURL(/\/demo\/login/);
});
