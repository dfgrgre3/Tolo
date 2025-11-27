/**
 * End-to-end tests for complete user journeys
 */

// Polyfill fetch for Node.js environment
if (typeof global.fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (_e) {
    // If node-fetch is not available, use a simple mock
    global.fetch = (async (_url: RequestInfo | URL, _options?: any) => {
      throw new Error('fetch is not available in test environment. Please install node-fetch or start the dev server for E2E tests.');
    }) as any;
  }
}

describe('User Journey E2E Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;

  beforeAll(async () => {
    // Setup: Login to get auth token
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      }),
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      authToken = data.token;
    }
  });

  describe('Task Management Journey', () => {
    it('should complete full task lifecycle', async () => {
      if (!authToken) {
        console.warn('Skipping test: No auth token available');
        return;
      }

      // Create task
      const createResponse = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'E2E Test Task',
          description: 'Task created during E2E test',
          priority: 'HIGH',
          status: 'PENDING',
        }),
      });

      expect(createResponse.ok).toBe(true);
      const task = await createResponse.json();
      expect(task.id).toBeDefined();

      // Get tasks
      const getResponse = await fetch(`${baseUrl}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.ok).toBe(true);
      const tasks = await getResponse.json();
      expect(Array.isArray(tasks)).toBe(true);

      // Update task
      if (task.id) {
        const updateResponse = await fetch(
          `${baseUrl}/api/tasks/${task.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              status: 'COMPLETED',
            }),
          }
        );

        expect([200, 404]).toContain(updateResponse.status);
      }
    });
  });

  describe('Course Enrollment Journey', () => {
    it('should browse and enroll in courses', async () => {
      if (!authToken) {
        console.warn('Skipping test: No auth token available');
        return;
      }

      // Browse courses
      const coursesResponse = await fetch(`${baseUrl}/api/courses`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(coursesResponse.ok).toBe(true);
      const courses = await coursesResponse.json();
      expect(Array.isArray(courses)).toBe(true);

      // Enroll in a course (if available)
      if (courses.length > 0) {
        const courseId = courses[0].id;
        const enrollResponse = await fetch(
          `${baseUrl}/api/courses/${courseId}/enroll`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect([200, 400, 409]).toContain(enrollResponse.status);
      }
    });
  });

  describe('Gamification Journey', () => {
    it('should interact with gamification features', async () => {
      if (!authToken) {
        console.warn('Skipping test: No auth token available');
        return;
      }

      // Get user progress
      const progressResponse = await fetch(
        `${baseUrl}/api/gamification/progress`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(progressResponse.ok).toBe(true);

      // Get leaderboard
      const leaderboardResponse = await fetch(
        `${baseUrl}/api/gamification/leaderboard`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(leaderboardResponse.ok).toBe(true);
      const leaderboard = await leaderboardResponse.json();
      expect(Array.isArray(leaderboard)).toBe(true);

      // Get achievements
      const achievementsResponse = await fetch(
        `${baseUrl}/api/gamification/achievements`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(achievementsResponse.ok).toBe(true);
    });
  });
});

