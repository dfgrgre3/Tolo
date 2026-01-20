import { GET } from '@/app/api/progress/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    progressSnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    studySession: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    task: {
      count: jest.fn(),
    },
    examResult: {
      findMany: jest.fn(),
    },
    recommendation: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    mlRecommendation: {
      findMany: jest.fn(),
      create: jest.fn(),
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

jest.mock('@/lib/cache-middleware', () => ({
  withAuthCache: jest.fn((req, handler, _key, _ttl) => handler(req)),
}));

describe('Progress API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/progress', () => {
    it('should return user progress summary', async () => {
      const _mockProgress = {
        totalStudyTime: 1000,
        tasksCompleted: 50,
        examsPassed: 10,
        currentStreak: 5,
        level: 5,
        totalXP: 5000,
      };

      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: new Date() },
        { startTime: new Date(Date.now() - 86400000) },
      ]);
      (prisma.mlRecommendation.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/progress', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/progress', {
        method: 'GET',
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
