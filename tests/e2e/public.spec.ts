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

test('Kazakh wide desktop hero keeps the demo action in the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1905, height: 866 });
  await page.goto('/');
  await page.getByRole('button', { name: 'ҚАЗ' }).click();

  const action = page.getByRole('link', { name: 'Сынақ платформасын көру' });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(866);
});

test('public links keep readable hover text and touch targets', async ({ page }) => {
  await page.goto('/');

  for (const selector of ['.public-header__brand', '.public-footer__brand']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const navigationLink = page.getByRole('link', { name: 'Как это задумано' });
  await navigationLink.hover();
  const colors = await navigationLink.evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  const channels = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const luminance = (color: string) => {
    const [red, green, blue] = channels(color).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  };
  const foreground = luminance(colors.foreground);
  const background = luminance(colors.background);
  const contrast = (Math.max(foreground, background) + 0.05)
    / (Math.min(foreground, background) + 0.05);
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
