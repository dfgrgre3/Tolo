import { test, expect } from '@playwright/test';

/**
 * Browser-level auth regression tests that do not require production data.
 * Backend-dependent lifecycle tests should run in a separate environment with
 * disposable PostgreSQL/Redis/Mailpit fixtures; these tests still protect the
 * frontend contract in the default Playwright webServer setup.
 */
test.describe('Authentication security regressions', () => {
  test('rejects anonymous access to the admin panel', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin|\/login/);
  });

  test('does not put a reset credential in the URL', async ({ page }) => {
    await page.route('**/api/v1/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'If an account exists, a code was sent.' },
        }),
      });
    });
    await page.route('**/api/v1/auth/forgot-password/verify-code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'set-cookie': 'reset_session=test-only; HttpOnly; SameSite=Lax; Path=/' },
        body: JSON.stringify({ success: true, data: { message: 'Code verified' } }),
      });
    });

    await page.goto('/forgot-password');
    const forgotForm = page.locator('main form').first();
    await page.locator('#email').fill('user@example.com');
    await forgotForm.locator('button[type="submit"]').click();
    await expect(page.locator('#code')).toBeVisible();
    await page.locator('#code').fill('123456');
    await forgotForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/reset-password$/);
    expect(new URL(page.url()).search).toBe('');
  });

  test('uses the same public error for different invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
      });
    });

    const messages: string[] = [];
    for (const email of ['missing@example.com', 'existing@example.com']) {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill('WrongPassword1!');
      await page.locator('main form').first().locator('button[type="submit"]').click();
      const error = page.locator('[role="alert"], .text-destructive').last();
      await expect(error).toBeVisible();
      messages.push((await error.textContent())?.trim() ?? '');
    }

    expect(messages[0]).toBe(messages[1]);
  });
});
