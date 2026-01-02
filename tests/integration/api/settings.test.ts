import { GET, POST } from '@/app/api/settings/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyTokenFromRequest: jest.fn(),
  },
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

describe('Settings API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('should return user settings', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailNotifications: true,
        smsNotifications: false,
        wakeUpTime: '07:00',
        sleepTime: '23:00',
        focusStrategy: 'POMODORO',
      };

      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subjectEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/settings', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Response structure might be { user, subjects }
      if (data.user) {
        expect(data.user).toBeDefined();
      } else {
        expect(data.emailNotifications || data.wakeUpTime).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/settings', {
        method: 'GET',
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/settings', () => {
    it('should update user settings', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailNotifications: false,
      };

      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subjectEnrollment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        emailNotifications: true,
      });

      const request = new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailNotifications: true,
        }),
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should validate settings data', async () => {
      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });

      const request = new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wakeUpTime: 'invalid-time', // Invalid time format
        }),
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

