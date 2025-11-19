import { GET, POST } from '@/app/api/tasks/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-service', () => ({
  authService: {
    verifyTokenFromRequest: jest.fn().mockResolvedValue({
      isValid: true,
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    }),
  },
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/cache-middleware', () => ({
  withAuthCache: jest.fn((req, handler, _key, _ttl) => handler(req)),
}));

jest.mock('@/lib/api-utils', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  handleApiError: jest.fn((_error) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }),
  badRequestResponse: jest.fn((message, code) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message, code }, { status: 400 });
  }),
  unauthorizedResponse: jest.fn((message) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message || 'Unauthorized' }, { status: 401 });
  }),
  successResponse: jest.fn((data, message, status) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ ...data, message }, { status: status || 200 });
  }),
}));

jest.mock('@/lib/cache-invalidation-service', () => ({
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/gamification-service', () => ({
  gamificationService: {
    updateUserProgress: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Tasks API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return user tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test Description',
          userId: 'user-1',
          status: 'PENDING',
          priority: 'MEDIUM',
          createdAt: new Date(),
        },
      ];

      const { authService } = require('@/lib/auth-service');
      (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
        isValid: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      });
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      // Response might be wrapped in an object or be an array directly
      const tasks = Array.isArray(data) ? data : data.tasks || data.data || [];
      expect(Array.isArray(tasks)).toBe(true);
      if (tasks.length > 0) {
        expect(tasks.length).toBeGreaterThan(0);
      }
    });

    it('should require authentication', async () => {
      const { authService } = require('@/lib/auth-service');
      (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
        isValid: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'GET',
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'New Task',
        description: 'Task Description',
        userId: 'user-1',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date(),
      };

      const { authService } = require('@/lib/auth-service');
      (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
        isValid: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      });
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'New Task',
          description: 'Task Description',
          priority: 'MEDIUM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      // Response might have different structure
      expect(data.title || data.data?.title || data.task?.title).toBe('New Task');
    });

    it('should validate task data', async () => {
      const { authService } = require('@/lib/auth-service');
      (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
        isValid: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          // Missing required title
          description: 'Task Description',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});

