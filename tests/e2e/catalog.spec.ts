import { test, expect } from '@playwright/test';

test.describe('Catalog page', () => {
  test('shows catalog heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Каталог пазлов');
  });

  test('shows search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('search filters puzzles', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('input[type="text"]');
    await search.fill('test query');
    await page.waitForTimeout(400);
  });
});

test.describe('Auth navigation', () => {
  test('shows login link for guests', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('navigates to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toHaveText('Вход');
  });

  test('navigates to register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toHaveText('Регистрация');
  });
});

test.describe('Mobile responsive', () => {
  test('hamburger menu appears on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.hamburger')).toBeVisible();
  });

  test('nav links are hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const navLinks = page.locator('.nav-links');
    await expect(navLinks).not.toHaveClass(/open/);
  });

  test('hamburger opens nav menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('.hamburger').click();
    const navLinks = page.locator('.nav-links');
    await expect(navLinks).toHaveClass(/open/);
  });
});