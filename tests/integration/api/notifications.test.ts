import { GET, POST } from '@/app/api/notifications/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-service', () => ({
  authService: {
    verifyTokenFromRequest: jest.fn(),
  },
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Notifications API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'New Task',
          message: 'You have a new task assigned',
          read: false,
          createdAt: new Date(),
        },
      ];

      const { verifyToken } = require('@/lib/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue(
        mockNotifications
      );
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.notifications.length).toBe(1);
    });

    it('should filter unread notifications', async () => {
      const { verifyToken } = require('@/lib/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost/api/notifications?unread=true',
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer test-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
        createdAt: new Date(),
      };

      const { verifyToken } = require('@/lib/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue(
        mockNotification
      );
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notification.title).toBe('Test Notification');
    });
  });
});

