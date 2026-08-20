import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main routes', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to courses
    await page.click('text=الدورات');
    await expect(page).toHaveURL(/.*courses/);
    
    // Test navigation to exams
    await page.click('text=الاختبارات');
    await expect(page).toHaveURL(/.*exams/);
  });

  test('should handle mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.click('[data-mobile-menu-toggle]');
    await expect(page.locator('[data-mobile-menu]')).toBeVisible();
    
    // Close mobile menu
    await page.click('[data-mobile-menu-toggle]');
    await expect(page.locator('[data-mobile-menu]')).not.toBeVisible();
  });
});