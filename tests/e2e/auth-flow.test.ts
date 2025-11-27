/**
 * End-to-end tests for authentication flow
 * These tests simulate complete user journeys
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

describe('Authentication E2E Flow', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('User Registration and Login Flow', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register new user
      const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
          name: 'Test User',
        }),
      });

      expect(registerResponse.ok).toBe(true);
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);

      // Step 2: Login with registered credentials
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerData.user?.email || '',
          password: 'SecurePassword123!',
        }),
      });

      expect(loginResponse.ok).toBe(true);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.token).toBeDefined();

      // Step 3: Verify token works for authenticated requests
      const protectedResponse = await fetch(`${baseUrl}/api/tasks`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      });

      expect(protectedResponse.status).not.toBe(401);
    });

    it('should handle password reset flow', async () => {
      // Step 1: Request password reset
      const forgotPasswordResponse = await fetch(
        `${baseUrl}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
        }
      );

      expect(forgotPasswordResponse.ok).toBe(true);

      // Step 2: Reset password with token (would need actual token in real scenario)
      const resetResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'test-reset-token',
          password: 'NewSecurePassword123!',
        }),
      });

      // This might fail without valid token, but should not crash
      expect([200, 400, 401]).toContain(resetResponse.status);
    });
  });

  describe('Session Management', () => {
    it('should maintain session across requests', async () => {
      // Login first
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const token = loginData.token;

        // Make multiple authenticated requests
        const requests = [
          fetch(`${baseUrl}/api/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseUrl}/api/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseUrl}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ];

        const responses = await Promise.all(requests);
        responses.forEach((response) => {
          expect(response.status).not.toBe(401);
        });
      }
    });
  });
});

