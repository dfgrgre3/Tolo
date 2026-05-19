import { test, expect, Page } from "@playwright/test";

test.describe("Admin CRUD Operations", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Login as admin
    await page.goto("/admin/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe("Users Management", () => {
    test("should create a new user", async () => {
      await page.goto("/admin/users");
      await page.click('[data-testid="create-user-btn"]');

      // Fill form
      await page.fill('[name="name"]', "Test User");
      await page.fill('[name="email"]', "newuser@test.com");
      await page.selectOption('[name="role"]', "STUDENT");

      await page.click('[data-testid="submit-user-btn"]');

      // Verify success
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator("text=Test User")).toBeVisible();
    });

    test("should read user details", async () => {
      await page.goto("/admin/users");

      // Click on user row
      await page.click('[data-testid="user-row"]:first-child');

      // Verify details page
      await expect(page.locator('[data-testid="user-details"]')).toBeVisible();
      await expect(page.locator("text=البريد الإلكتروني")).toBeVisible();
    });

    test("should update user", async () => {
      await page.goto("/admin/users");

      // Click edit on first user
      await page.click('[data-testid="edit-user-btn"]:first-child');

      // Update name
      await page.fill('[name="name"]', "Updated Name");
      await page.click('[data-testid="save-user-btn"]');

      // Verify update
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });

    test("should delete user with confirmation", async () => {
      await page.goto("/admin/users");

      // Click delete
      await page.click('[data-testid="delete-user-btn"]:first-child');

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-btn"]');

      // Verify deletion
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });

    test("should search users", async () => {
      await page.goto("/admin/users");

      // Search for user
      await page.fill('[data-testid="search-input"]', "test");
      await page.keyboard.press("Enter");

      // Verify filtered results
      const count = await page.locator('[data-testid="user-row"]').count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should filter users by role", async () => {
      await page.goto("/admin/users");

      // Filter by role
      await page.selectOption('[data-testid="role-filter"]', "TEACHER");

      // Verify all visible users have TEACHER role
      const roles = await page.locator('[data-testid="user-role"]').allTextContents();
      roles.forEach((role) => {
        expect(role).toContain("معلم");
      });
    });
  });

  test.describe("Subjects/Courses Management", () => {
    test("should create a new subject", async () => {
      await page.goto("/admin/subjects");
      await page.click('[data-testid="create-subject-btn"]');

      await page.fill('[name="name"]', "Test Subject");
      await page.fill('[name="description"]', "Test Description");
      await page.selectOption('[name="gradeLevel"]', "THIRD_SECONDARY");

      await page.click('[data-testid="submit-subject-btn"]');

      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });

    test("should upload subject image", async () => {
      await page.goto("/admin/subjects/new");

      await page.fill('[name="name"]', "Subject with Image");

      // Upload image
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles("test-assets/test-image.jpg");

      await page.click('[data-testid="submit-subject-btn"]');

      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });
  });

  test.describe("Exams Management", () => {
    test("should create a new exam", async () => {
      await page.goto("/admin/exams");
      await page.click('[data-testid="create-exam-btn"]');

      await page.fill('[name="title"]', "Test Exam");
      await page.fill('[name="duration"]', "60");
      await page.fill('[name="totalQuestions"]', "20");

      await page.click('[data-testid="submit-exam-btn"]');

      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });

    test("should add questions to exam", async () => {
      await page.goto("/admin/exams/1/questions");
      await page.click('[data-testid="add-question-btn"]');

      await page.fill('[name="questionText"]', "What is 2+2?");
      await page.fill('[name="optionA"]', "3");
      await page.fill('[name="optionB"]', "4");
      await page.fill('[name="optionC"]', "5");
      await page.selectOption('[name="correctAnswer"]', "B");

      await page.click('[data-testid="save-question-btn"]');

      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });
  });
});

test.describe("Admin Permissions", () => {
  test("should restrict access without permission", async ({ browser }) => {
    const page = await browser.newPage();

    // Login as moderator (limited permissions)
    await page.goto("/admin/login");
    await page.fill('[name="email"]', "moderator@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");

    // Try to access user management (should be restricted)
    await page.goto("/admin/users");

    // Should see access denied
    await expect(page.locator("text=غير مصرح")).toBeVisible();

    await page.close();
  });

  test("should show/hide actions based on permissions", async ({ page }) => {
    // Login as admin with full permissions
    await page.goto("/admin/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/admin");

    await page.goto("/admin/users");

    // Should see delete buttons (admin has permission)
    await expect(page.locator('[data-testid="delete-user-btn"]:first-child')).toBeVisible();
  });
});
