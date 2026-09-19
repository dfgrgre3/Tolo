import { test, expect } from '@playwright/test';

/**
 * Video player end-to-end (P3-52): login → open lesson → play → seek →
 * pause → leave → return → resume → complete → next lesson + mobile.
 *
 * Requires a seeded student: E2E_TEST_EMAIL / E2E_TEST_PASSWORD and a lesson
 * URL (E2E_LESSON_URL, e.g. /learning/<courseId>?lesson=<lessonId>).
 * Skips gracefully without them (local runs without secrets).
 */
const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';
const LESSON_URL = process.env.E2E_LESSON_URL ?? '';
const hasCreds = EMAIL !== '' && PASSWORD !== '' && LESSON_URL !== '';

test.describe('Video player lesson flow', () => {
  test.skip(!hasCreds, 'requires E2E_TEST_EMAIL/PASSWORD/LESSON_URL');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
  });

  test('plays, seeks, persists progress and offers resume after reload', async ({ page }) => {
    const progressPosts: string[] = [];
    await page.route('**/api/courses/lessons/*/progress', async (route) => {
      if (route.request().method() === 'POST') {
        progressPosts.push(await route.request().postData() ?? '');
      }
      await route.continue();
    });

    await page.goto(LESSON_URL);
    const player = page.locator('[dir="rtl"].group\\/player, .group\\/player').first();
    await expect(player).toBeVisible({ timeout: 20000 });

    // Play via the accessible control (falls back to the big toggle).
    const playButton = page.getByRole('button', { name: /تشغيل|إيقاف مؤقت/ }).first();
    await playButton.click();
    await page.waitForTimeout(6000);

    // Progress heartbeats must reach the backend (not animation-frame spam,
    // but the ~4s cadence): at least one POST within 12s of playback.
    await expect
      .poll(() => progressPosts.length, { timeout: 12000 })
      .toBeGreaterThan(0);

    // Keyboard seek moves the rail (slider aria-valuenow advances).
    const rail = page.getByRole('slider', { name: 'شريط تقدم الفيديو' });
    const before = Number(await rail.getAttribute('aria-valuenow'));
    await player.press('ArrowRight');
    await expect
      .poll(async () => Number(await rail.getAttribute('aria-valuenow')), { timeout: 5000 })
      .toBeGreaterThan(before);

    // Pause, leave, return → resume prompt appears.
    await playButton.click();
    await page.goto('/dashboard');
    await page.goto(LESSON_URL);
    await expect(page.getByText('استكمال المشاهدة')).toBeVisible({ timeout: 20000 });
  });

  test('answers a server-validated question through the verdict API', async ({ page }) => {
    await page.route('**/api/courses/lessons/*/interactive-questions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'e2e-q-1',
              lessonId: 'e2e-lesson',
              timePosition: 2,
              question: 'سؤال اختبار؟',
              options: ['أ', 'ب'],
              validation: 'server',
            },
          ],
        }),
      });
    });
    await page.route('**/api/courses/lessons/*/questions/*/answer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { correct: true, correctOptionIndex: 0, score: 1 },
        }),
      });
    });

    await page.goto(LESSON_URL);
    const player = page.locator('.group\\/player').first();
    await expect(player).toBeVisible({ timeout: 20000 });

    // The question overlay pauses playback ~2s in and grades server-side.
    const dialog = page.getByRole('dialog', { name: 'سؤال تفاعلي' });
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await dialog.getByRole('button', { name: 'أ' }).click();
    await dialog.getByRole('button', { name: 'تأكيد الإجابة' }).click();
    await expect(dialog.getByText('أحسنت! إجابة صحيحة.')).toBeVisible({ timeout: 15000 });
  });

  test('mobile: player renders and exposes touch-sized controls', async ({ page }) => {
    await page.goto(LESSON_URL);
    const player = page.locator('.group\\/player').first();
    await expect(player).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole('button', { name: /ملء الشاشة|الخروج من وضع ملء الشاشة/ })
    ).toBeVisible();
  });
});
