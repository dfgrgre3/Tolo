/**
 * Comprehensive Auth Client Tests
 * Tests the auth-client API functions
 */

import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Auth Client Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('loginUser', () => {
    it('should validate request structure', async () => {
      await expect(loginUser(null as any)).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
      });

      await expect(loginUser([] as any)).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
      });
    });

    it('should validate email', async () => {
      await expect(
        loginUser({
          email: '',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_EMAIL',
      });

      await expect(
        loginUser({
          email: 'a'.repeat(255) + '@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        code: 'EMAIL_TOO_LONG',
      });

      await expect(
        loginUser({
          email: 'invalid-email',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_EMAIL_FORMAT',
      });
    });

    it('should reject malicious email patterns', async () => {
      const maliciousEmails = [
        'test..user@example.com',
        '.test@example.com',
        'test@example.com.',
      ];

      for (const email of maliciousEmails) {
        await expect(
          loginUser({
            email,
            password: 'password123',
          })
        ).rejects.toMatchObject({
          code: 'INVALID_EMAIL_FORMAT',
        });
      }
    });

    it('should validate password', async () => {
      await expect(
        loginUser({
          email: 'test@example.com',
          password: '',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_PASSWORD',
      });

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toMatchObject({
        code: 'PASSWORD_TOO_SHORT',
      });

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'a'.repeat(129),
        })
      ).rejects.toMatchObject({
        code: 'PASSWORD_TOO_LONG',
      });
    });

    it('should normalize email to lowercase', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify({
          token: 'test-token',
          user: { id: '1', email: 'test@example.com' },
        }),
      });

      await loginUser({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.email).toBe('test@example.com');
    });

    it('should handle successful login', async () => {
      const mockResponse = {
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
        sessionId: 'session-1',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('test-token');
      expect(result.user).toBeDefined();
    });

    it('should handle 2FA requirement', async () => {
      const mockResponse = {
        requiresTwoFactor: true,
        loginAttemptId: 'attempt-123',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        methods: ['email'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.loginAttemptId).toBe('attempt-123');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        code: expect.any(String),
      });
    });

    it('should handle timeout errors', async () => {
      const abortController = new AbortController();
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => {
          setTimeout(() => abortController.abort(), 100);
          return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
        }
      );

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        code: expect.any(String),
      });
    });
  });

  describe('verifyTwoFactor', () => {
    it('should validate loginAttemptId', async () => {
      await expect(
        verifyTwoFactor({
          loginAttemptId: '',
          code: '123456',
        })
      ).rejects.toMatchObject({
        code: 'MISSING_LOGIN_ATTEMPT_ID',
      });
    });

    it('should validate code format', async () => {
      await expect(
        verifyTwoFactor({
          loginAttemptId: 'attempt-123',
          code: '12345', // Too short
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CODE_FORMAT',
      });

      await expect(
        verifyTwoFactor({
          loginAttemptId: 'attempt-123',
          code: '12345a', // Not all digits
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CODE_FORMAT',
      });
    });

    it('should handle successful verification', async () => {
      const mockResponse = {
        token: 'test-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
        sessionId: 'session-1',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await verifyTwoFactor({
        loginAttemptId: 'attempt-123',
        code: '123456',
      });

      expect(result.token).toBe('test-token');
      expect(result.user).toBeDefined();
    });
  });
});

