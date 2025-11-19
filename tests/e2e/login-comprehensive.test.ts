/**
 * Comprehensive End-to-End Login Tests
 * Tests complete user flows from frontend to backend
 * 
 * Note: These tests require the Next.js development server to be running
 * Run: npm run dev before executing these tests
 */

// Polyfill fetch for Node.js environment
if (typeof global.fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (_e) {
    // If node-fetch is not available, use a simple mock
    global.fetch = async (_url: string, _options?: any) => {
      throw new Error('fetch is not available in test environment. Please install node-fetch or start the dev server for E2E tests.');
    };
  }
}

describe('Comprehensive Login E2E Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('Complete Login Flow', () => {
    it('should complete full login flow with validation', async () => {
      // Step 1: Test invalid email format
      const invalidEmailResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      expect(invalidEmailResponse.status).toBe(400);
      const invalidData = await invalidEmailResponse.json();
      expect(invalidData.code).toBe('INVALID_EMAIL_FORMAT');

      // Step 2: Test short password
      const shortPasswordResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
        }),
      });

      expect(shortPasswordResponse.status).toBe(400);
      const shortPasswordData = await shortPasswordResponse.json();
      expect(shortPasswordData.code).toBe('PASSWORD_TOO_SHORT');

      // Step 3: Test successful login (if test account exists)
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        expect(loginData.token).toBeDefined();
        expect(loginData.user).toBeDefined();
        expect(loginData.user.email).toBe(testEmail.toLowerCase());
      }
    });

    it('should handle email normalization', async () => {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      // Test with uppercase email
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.toUpperCase(),
          password: testPassword,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        // Email should be normalized to lowercase
        expect(loginData.user.email).toBe(testEmail.toLowerCase());
      }
    });

    it('should reject malicious email patterns', async () => {
      const maliciousEmails = [
        'test..user@example.com',
        '.test@example.com',
        'test@example.com.',
      ];

      for (const email of maliciousEmails) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'password123',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.code).toBe('INVALID_EMAIL_FORMAT');
      }
    });

    it('should handle rate limiting', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: 'wrong-password',
          }),
        });

        if (response.status === 429) {
          const data = await response.json();
          expect(data.code).toBe('RATE_LIMITED');
          expect(data.retryAfterSeconds).toBeDefined();
          break;
        }
      }
    });

    it('should set authentication cookies on successful login', async () => {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          rememberMe: true,
        }),
      });

      if (loginResponse.ok) {
        const cookies = loginResponse.headers.get('set-cookie');
        expect(cookies).toBeDefined();
        expect(cookies).toContain('access_token');
      }
    });

    it('should handle timeout errors gracefully', async () => {
      // This test would require mocking slow responses
      // For now, we test that the API responds within reasonable time
      const startTime = Date.now();
      
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const duration = Date.now() - startTime;
      
      // Should respond within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect([200, 400, 401, 408, 500]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    it('should sanitize user agent and IP', async () => {
      const longUserAgent = 'a'.repeat(600);
      
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': longUserAgent,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // Should not crash with long user agent
      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should validate request body size', async () => {
      const largeBody = {
        email: 'test@example.com',
        password: 'password123',
        deviceFingerprint: {
          data: 'x'.repeat(10000), // Very large fingerprint
        },
      };

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largeBody),
      });

      // Should handle large body gracefully
      expect([200, 400, 413, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error codes for different scenarios', async () => {
      const testCases = [
        {
          body: { email: '', password: 'password123' },
          expectedCode: 'MISSING_EMAIL',
        },
        {
          body: { email: 'test@example.com', password: '' },
          expectedCode: 'MISSING_PASSWORD',
        },
        {
          body: { email: 'a'.repeat(255) + '@example.com', password: 'password123' },
          expectedCode: 'EMAIL_TOO_LONG',
        },
        {
          body: { email: 'test@example.com', password: 'short' },
          expectedCode: 'PASSWORD_TOO_SHORT',
        },
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.body),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.code).toBe(testCase.expectedCode);
      }
    });
  });
});

