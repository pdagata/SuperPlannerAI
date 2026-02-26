import { test, expect } from '@playwright/test';

// Helper: log in with demo superadmin account
async function loginAsSuperAdmin(page: any) {
  await page.goto('/');
  // Click the superadmin demo button
  await page.getByText('superadmin').click();
  // Wait for the dashboard to appear after login
  await page.waitForURL('/', { timeout: 10000 });
}

test.describe('App Navigation (requires server + DB)', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AgileFlow AI')).toBeVisible();
  });

  test('page title is set', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AgileFlow|Agile|Planner/i);
  });

  test('login form has username and password fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
