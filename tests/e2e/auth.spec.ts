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

test('sign-in and sign-out protect the route', async ({ page }) => {
  test.skip(!process.env.TEST_DEMO_EMAIL || !process.env.TEST_DEMO_PASSWORD, 'Demo credentials unavailable');
  await page.goto('/demo/login?next=%2Fdemo%2Fprofile');
  await page.getByRole('textbox', { name: /email|электрон|пошта/i }).fill(process.env.TEST_DEMO_EMAIL!);
  await page.getByLabel(/password|пароль|құпиясөз/i).fill(process.env.TEST_DEMO_PASSWORD!);
  await page.getByRole('button', { name: /sign in|войти|кіру/i }).click();
  await expect(page).toHaveURL(/\/demo\/profile/);
  await page.getByRole('button', { name: /sign out|выйти|шығу/i }).click();
  await expect(page).toHaveURL(/\/demo\/login/);
  await page.goto('/demo/profile');
  await expect(page).toHaveURL(/\/demo\/login/);
});
