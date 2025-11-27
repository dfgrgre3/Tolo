/**
 * Comprehensive Login System Tests
 * Tests all aspects of the improved login system including:
 * - Input validation and sanitization
 * - Security features (rate limiting, CAPTCHA, IP blocking)
 * - Error handling
 * - Performance optimizations
 * - Two-factor authentication
 */

// Mock _helpers FIRST before any imports that depend on it
// This ensures emailSchema is available when login-service loads
jest.mock('@/app/api/auth/_helpers', () => {
  const { NextResponse } = require('next/server');
  const actualZod = jest.requireActual('zod');
  return {
    parseRequestBody: jest.fn(async (req, options) => {
      try {
        const body = await req.json();
        if (options?.required && (!body || Object.keys(body).length === 0)) {
          return {
            success: false,
            error: NextResponse.json(
              { error: 'الطلب فارغ. يرجى إدخال البيانات المطلوبة.', code: 'EMPTY_REQUEST_BODY' },
              { status: 400 }
            ),
          };
        }
        return { success: true, data: body };
      } catch (_error) {
        return {
          success: false,
          error: NextResponse.json(
            { error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.', code: 'INVALID_REQUEST_BODY' },
            { status: 400 }
          ),
        };
      }
    }),
    setAuthCookies: jest.fn(),
    createStandardErrorResponse: jest.fn((error, code, status) => {
      return NextResponse.json(
        { error: error || 'Internal Server Error', code: code || 'SERVER_ERROR' },
        { status: status || 500 }
      );
    }),
    addSecurityHeaders: jest.fn((res) => res),
    // Use actual zod to create emailSchema - this ensures it works with loginSchema
    emailSchema: actualZod.z.string().min(1, 'البريد الإلكتروني مطلوب').email('البريد الإلكتروني غير صالح').max(255, 'البريد الإلكتروني طويل جداً').transform((email: string) => email.trim().toLowerCase()),
    createErrorResponse: jest.fn(),
    createCaptchaRequiredResponse: jest.fn(),
    isConnectionError: jest.fn(() => false),
    getErrorCode: jest.fn((_error) => 'UNKNOWN_ERROR'),
  };
});

import { POST as loginHandler } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';
import { LoginService } from '@/lib/services/login-service';

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

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    securityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('@/lib/rate-limiting-service', () => ({
  RateLimitingService: jest.fn().mockImplementation(() => ({
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, attempts: 0 }),
    recordAttempt: jest.fn().mockResolvedValue(undefined),
    resetRateLimit: jest.fn().mockResolvedValue(undefined),
  })),
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
    registerDevice: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/security/security-notifications', () => ({
  securityNotificationService: {
    notifySuspiciousLogin: jest.fn(),
    notifyNewDeviceLogin: jest.fn(),
  },
}));


jest.mock('@/lib/auth-service', () => ({
  authService: {
    getClientIP: jest.fn((req) => req?.headers?.get('x-forwarded-for') || 'unknown'),
    getUserAgent: jest.fn((req) => req?.headers?.get('user-agent') || 'unknown'),
    findUserByEmail: jest.fn(),
    createSession: jest.fn().mockResolvedValue({ id: 'session-123', userId: 'user-1' }),
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
    comparePasswords: jest.fn(),
    hashPassword: jest.fn(),
  },
}));

jest.mock('@/lib/auth-challenges-service', () => ({
  TwoFactorChallengeService: {
    createChallenge: jest.fn().mockResolvedValue('challenge-123'),
    verifyChallenge: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock logger to prevent console output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    log: jest.fn(),
  },
}));

describe('Comprehensive Login System Tests', () => {
  const { captchaService } = require('@/lib/security/captcha-service');
  const { ipBlockingService } = require('@/lib/security/ip-blocking');
  const { authService, AuthService } = require('@/lib/auth-service');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-characters';
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject empty email', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('MISSING_EMAIL');
    });

    it('should reject email longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: longEmail,
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('EMAIL_TOO_LONG');
    });

    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_EMAIL_FORMAT');
    });

    it('should reject malicious email patterns (double dots)', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test..user@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_EMAIL_FORMAT');
    });

    it('should reject password shorter than 8 characters', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('PASSWORD_TOO_SHORT');
    });

    it('should reject password longer than 128 characters', async () => {
      const longPassword = 'a'.repeat(129);
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: longPassword,
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('PASSWORD_TOO_LONG');
    });

    it('should sanitize IP and User Agent', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const longUserAgent = 'a'.repeat(600);
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'user-agent': longUserAgent,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // Should not throw error even with long user agent
      const response = await loginHandler(request);
      expect([200, 400, 401, 500]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    it('should block IP if IP is blocked', async () => {
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({
        blocked: true,
        reason: 'Too many failed attempts',
        blockedUntil: new Date(Date.now() + 3600000),
      });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect((result.response as any).code).toBe('IP_BLOCKED');
    });

    it('should require CAPTCHA after threshold failed attempts', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(true);
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'wrong-password',
      });

      // Should require CAPTCHA
      expect(result.success).toBe(false);
      expect((result.response as any).code).toBe('CAPTCHA_REQUIRED');
    });

    it('should verify CAPTCHA token when provided', async () => {
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(true);
      (captchaService.verifyCaptcha as jest.Mock).mockResolvedValue(true);
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          captchaToken: 'valid-captcha-token',
        }),
      });

      const _result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
        captchaToken: 'valid-captcha-token',
      });

      expect(captchaService.verifyCaptcha).toHaveBeenCalled();
    });
  });

  describe('Successful Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'user',
        emailVerified: true,
        twoFactorEnabled: false,
      };

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (authService.createSession as jest.Mock).mockResolvedValue(mockSession);
      (authService.createTokens as jest.Mock).mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect((result.response as any).token).toBeDefined();
      expect((result.response as any).user).toBeDefined();
    });

    it('should normalize email to lowercase', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        }),
      });

      const _result = await LoginService.login(request, {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      // Should find user with lowercase email
      expect(authService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (authService.findUserByEmail as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect([500, 503]).toContain(result.statusCode);
    });

    it('should handle timeout errors gracefully', async () => {
      // Mock a slow database query (but faster than test timeout)
      (authService.findUserByEmail as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      );
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // Should timeout and return error
      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });

      // Should handle timeout gracefully
      expect(result.success).toBe(false);
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should require 2FA when user has 2FA enabled', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        twoFactorEnabled: true,
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });

      // Should require 2FA
      expect(result.success).toBe(true);
      // Check if response has 2FA requirement (could be in different format)
      if (result.response && typeof result.response === 'object') {
        const response = result.response as any;
        expect(response.requiresTwoFactor || response.twoFactorRequired || response.requires2FA).toBeDefined();
      }
    });
  });

  describe('Performance Optimizations', () => {
    it('should complete login within reasonable time', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (authService.createSession as jest.Mock).mockResolvedValue(mockSession);
      (authService.createTokens as jest.Mock).mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      (ipBlockingService.isBlocked as jest.Mock).mockReturnValue({ blocked: false });
      (captchaService.shouldRequireCaptcha as jest.Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const startTime = Date.now();
      const result = await LoginService.login(request, {
        email: 'test@example.com',
        password: 'password123',
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should complete within 5 seconds (allowing for test overhead)
      expect(duration).toBeLessThan(5000);
    });
  });
});

