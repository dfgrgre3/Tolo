/**
 * Comprehensive LoginService Unit Tests
 * Tests all methods and edge cases in LoginService
 */

// Mock _helpers FIRST before any imports that depend on it
jest.mock('@/app/api/auth/_helpers', () => {
  const actualZod = jest.requireActual('zod');
  return {
    emailSchema: actualZod.z.string().min(1).email().max(255).transform((email: string) => email.trim().toLowerCase()),
    createErrorResponse: jest.fn(),
    createCaptchaRequiredResponse: jest.fn(),
    isConnectionError: jest.fn(() => false),
    getErrorCode: jest.fn((_error) => 'UNKNOWN_ERROR'),
  };
});

import { LoginService } from '@/lib/services/login-service';
import { SecurityCheckService } from '@/lib/services/security-check-service';

// Mock jose library (ES modules)
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-access-token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
  }),
}));

jest.mock('@/lib/auth-service', () => ({
  authService: {
    getClientIP: jest.fn(),
    getUserAgent: jest.fn(),
    findUserByEmail: jest.fn(),
    createSession: jest.fn(),
    createTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
    resetRateLimit: jest.fn().mockResolvedValue(undefined),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
  },
  AuthService: {
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    comparePasswords: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    securityLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/rate-limiting-service', () => ({
  RateLimitingService: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('@/lib/security/ip-blocking', () => ({
  ipBlockingService: {
    isBlocked: jest.fn(),
    recordFailedAttempt: jest.fn(),
  },
}));

jest.mock('@/lib/security/captcha-service', () => ({
  captchaService: {
    shouldRequireCaptcha: jest.fn(),
    verifyCaptcha: jest.fn(),
  },
}));

jest.mock('@/lib/security/risk-assessment', () => ({
  riskAssessmentService: {
    assessLoginRisk: jest.fn(),
  },
}));

jest.mock('@/lib/security/device-manager', () => ({
  deviceManagerService: {
    registerDevice: jest.fn(),
  },
}));

jest.mock('@/lib/security/security-notifications', () => ({
  securityNotificationService: {
    notifySuspiciousLogin: jest.fn(),
    notifyNewDeviceLogin: jest.fn(),
  },
}));

jest.mock('@/lib/auth-challenges-service', () => ({
  TwoFactorChallengeService: {
    createChallenge: jest.fn(),
  },
}));

describe('LoginService Comprehensive Tests', () => {
  const { authService } = require('@/lib/auth-service');
  const { prisma } = require('@/lib/prisma');
  const { captchaService } = require('@/lib/security/captcha-service');
  const { ipBlockingService } = require('@/lib/security/ip-blocking');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-characters';
  });

  describe('validateRequestBody', () => {
    it('should validate correct request body', () => {
      const body = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const result = LoginService.validateRequestBody(body);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const body = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = LoginService.validateRequestBody(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const body = {
        email: 'test@example.com',
        password: 'short',
      };

      const result = LoginService.validateRequestBody(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject password longer than 128 characters', () => {
      const body = {
        email: 'test@example.com',
        password: 'a'.repeat(129),
      };

      const result = LoginService.validateRequestBody(body);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('checkIPBlocking', () => {
    it('should return null if IP is not blocked', async () => {
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const result = await SecurityCheckService.checkIPBlocking('192.168.1.1');

      expect(result).toBeNull();
    });

    it('should return error if IP is blocked', async () => {
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({
        blocked: true,
        reason: 'Too many failed attempts',
        blockedUntil: new Date(Date.now() + 3600000),
      });

      const result = await SecurityCheckService.checkIPBlocking('192.168.1.1');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect((result as any)?.response.code).toBe('IP_BLOCKED');
    });
  });

  describe('checkRateLimiting', () => {
    it('should return null if rate limit is not exceeded', async () => {
      const rateLimitStatus = {
        allowed: true,
        attempts: 2,
      };

      const result = await SecurityCheckService.checkRateLimiting(
        rateLimitStatus,
        '192.168.1.1',
        'test-agent'
      );

      expect(result).toBeNull();
    });

    it('should return error if rate limit is exceeded', async () => {
      const rateLimitStatus = {
        allowed: false,
        attempts: 6,
        lockedUntil: Date.now() + 1800000,
      };

      const result = await SecurityCheckService.checkRateLimiting(
        rateLimitStatus,
        '192.168.1.1',
        'test-agent'
      );

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect((result as any)?.response.code).toBe('RATE_LIMITED');
    });
  });

  describe('checkCaptcha', () => {
    it('should return null if CAPTCHA is not required', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(false);

      const result = await SecurityCheckService.checkCaptcha(
        2,
        undefined,
        '192.168.1.1',
        'test@example.com'
      );

      expect(result).toBeNull();
    });

    it('should return error if CAPTCHA is required but not provided', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(true);

      const result = await SecurityCheckService.checkCaptcha(
        4,
        undefined,
        '192.168.1.1',
        'test@example.com'
      );

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect((result as any)?.response.code).toBe('CAPTCHA_REQUIRED');
    });

    it('should verify CAPTCHA token when provided', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(true);
      (captchaService.verifyCaptcha as jest.Mock).mockResolvedValue(true);

      const result = await SecurityCheckService.checkCaptcha(
        4,
        'valid-captcha-token',
        '192.168.1.1',
        'test@example.com'
      );

      expect(captchaService.verifyCaptcha).toHaveBeenCalledWith(
        'valid-captcha-token',
        '192.168.1.1'
      );
      expect(result).toBeNull(); // Should pass if CAPTCHA is valid
    });

    it('should return error if CAPTCHA verification fails', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(true);
      (captchaService.verifyCaptcha as jest.Mock).mockResolvedValue(false);

      const result = await SecurityCheckService.checkCaptcha(
        4,
        'invalid-captcha-token',
        '192.168.1.1',
        'test@example.com'
      );

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect((result as any)?.response.code).toBe('CAPTCHA_INVALID');
    });
  });

  // findOrCreateUser tests removed as the method is not exposed or does not exist
});

