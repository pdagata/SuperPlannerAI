import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows login page on first load', async ({ page }) => {
    await expect(page.getByText('AgileFlow AI')).toBeVisible();
    await expect(page.getByText('Sign in to your workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.locator('input[type="text"]').fill('wronguser');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials|connection error/i)).toBeVisible({ timeout: 5000 });
  });

  test('navigates to register form', async ({ page }) => {
    await page.getByRole('button', { name: /sign up free/i }).click();
    await expect(page.getByText('Create your free workspace')).toBeVisible();
    await expect(page.getByPlaceholder('Workspace name *')).toBeVisible();
  });

  test('navigates back from register to login', async ({ page }) => {
    await page.getByRole('button', { name: /sign up free/i }).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText('Sign in to your workspace')).toBeVisible();
  });

  test('navigates to forgot password form', async ({ page }) => {
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByText('Reset your password')).toBeVisible();
    await expect(page.getByPlaceholder('Your email address')).toBeVisible();
  });

  test('register shows validation error if fields are empty', async ({ page }) => {
    await page.getByRole('button', { name: /sign up free/i }).click();
    await page.getByRole('button', { name: /create workspace/i }).click();
    await expect(page.getByText(/all fields are required/i)).toBeVisible();
  });

  test('demo quick access buttons are visible', async ({ page }) => {
    await expect(page.getByText('Quick Demo Access')).toBeVisible();
    await expect(page.getByText('superadmin')).toBeVisible();
    await expect(page.getByText('admin1')).toBeVisible();
    await expect(page.getByText('dev1')).toBeVisible();
    await expect(page.getByText('qa1')).toBeVisible();
  });
});
