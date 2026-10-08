import { expect, test } from '@playwright/test';

test('public landing explains the planned journey and identifies the internal demo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Путь к поддержке — понятнее и ближе');
  await expect(page.getByRole('heading', { name: 'От запроса до встречи — три понятных шага' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Посмотреть тестовую платформу' })).toHaveAttribute('href', '/demo/login');
  await expect(page.getByText('Сейчас доступна только внутренняя тестовая версия с вымышленными данными.')).toBeVisible();
});

test('language switch translates the entire public journey', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ҚАЗ' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'kk');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Қолдауға апарар жол — түсініктірек әрі жақынырақ');
  await expect(page.getByRole('heading', { name: 'Сұраныстан кездесуге дейін — үш түсінікті қадам' })).toBeVisible();
  await expect(page.getByText('Қазір тек ойдан шығарылған деректері бар ішкі сынақ нұсқасы қолжетімді.')).toBeVisible();
});

test('public page fits narrow screens without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Посмотреть тестовую платформу' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
