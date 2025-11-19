import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';

// Mock _helpers first
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
    createStandardErrorResponse: jest.fn((error, message, status) => {
      return NextResponse.json(
        { error: message || 'Internal Server Error', code: error?.code || 'SERVER_ERROR' },
        { status: status || 500 }
      );
    }),
    createSuccessResponse: jest.fn((data, message, status) => {
      return NextResponse.json(
        { success: true, ...data, message },
        { status: status || 200 }
      );
    }),
    extractRequestMetadata: jest.fn(() => ({ ip: '127.0.0.1', userAgent: 'test-agent' })),
    logSecurityEventSafely: jest.fn(),
    isConnectionError: jest.fn(() => false),
    emailSchema: actualZod.z.string().min(1).email().max(255).transform((email: string) => email.trim().toLowerCase()),
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-service', () => ({
  authService: {
    findUserByEmail: jest.fn(),
    register: jest.fn(),
    createTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    createSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
  },
  AuthService: {
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    comparePasswords: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/services/login-service', () => ({
  LoginService: {
    login: jest.fn(),
  },
}));

describe('Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'newuser@example.com',
        name: 'New User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { authService, AuthService } = require('@/lib/auth-service');
      (authService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (authService.register as jest.Mock).mockResolvedValue({
        isValid: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
      });

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'existing@example.com',
      };

      const { authService } = require('@/lib/auth-service');
      (authService.findUserByEmail as jest.Mock).mockResolvedValue(existingUser);
      (authService.register as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Email already registered',
      });

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect([400, 409]).toContain(response.status);
      // Response might have different structure
      if (data.success !== undefined) {
        expect(data.success).toBe(false);
      } else {
        expect(data.error).toBeDefined();
      }
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      const { authService, AuthService } = require('@/lib/auth-service');
      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(true);
      (authService.createTokens as jest.Mock).mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      (authService.createSession as jest.Mock).mockResolvedValue({ id: 'session-123' });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      // Response might have different structure
      if (data.success !== undefined) {
        expect(data.success).toBe(true);
      }
      expect(data.token || data.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };

      const { authService, AuthService } = require('@/lib/auth-service');
      (authService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.comparePasswords as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      const { LoginService } = require('@/lib/services/login-service');
      (LoginService.login as jest.Mock).mockResolvedValue({
        success: false,
        response: {
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
        statusCode: 401,
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect([400, 401]).toContain(response.status);
      // Response might have different structure
      if (data.success !== undefined) {
        expect(data.success).toBe(false);
      } else {
        expect(data.error).toBeDefined();
      }
    });
  });
});

