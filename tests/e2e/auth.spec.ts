import { test, expect } from '@playwright/test';

test.describe('Login form', () => {
  test('shows validation on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('nonexistent');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Register form', () => {
  test('shows password length validation', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[type="password"]').fill('short');
    const input = page.locator('input[type="password"]');
    await expect(input).toHaveAttribute('minlength', '8');
  });
});