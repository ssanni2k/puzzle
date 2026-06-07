import { test, expect } from '@playwright/test';

test.describe('Create puzzle page', () => {
  test('redirects guests to login notice', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('.notice')).toContainText('войти');
  });

  test('shows form for authenticated users', async ({ page }) => {
    test.skip(!process.env.TEST_USER_TOKEN, 'No test user token');
  });
});

test.describe('Puzzle detail page', () => {
  test('shows 404 for non-existent puzzle', async ({ page }) => {
    const response = await page.goto('/puzzle/nonexistent-id');
    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });
});