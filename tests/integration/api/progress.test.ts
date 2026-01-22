import { GET } from '@/app/api/progress/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    studySession: {
      findMany: jest.fn(),
    },
    customGoal: {
      findMany: jest.fn(),
    },
    // Keeping other mocks just in case, but they seem unused by the current route implementation
    progressSnapshot: { findMany: jest.fn(), findFirst: jest.fn() },
    task: { count: jest.fn() },
    examResult: { findMany: jest.fn() },
    recommendation: { findMany: jest.fn(), delete: jest.fn() },
    mlRecommendation: { findMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/services/auth-service', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/cache-middleware', () => ({
  withAuthCache: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/cache-invalidation-service', () => ({
  invalidateUserCache: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { verifyToken } from '@/lib/services/auth-service';

describe('Progress API Routes', () => {
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
    });
    // Default mocks
    (prisma.customGoal.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);
  });

  const createRequest = () => {
    return new NextRequest('http://localhost:3000/api/progress', {
        method: 'GET',
    });
  };

  describe('GET /api/progress', () => {
    it('should return user progress summary (legacy test fixed)', async () => {
      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: new Date() },
        { startTime: new Date(Date.now() - 86400000) },
      ]);

      const response = await GET(createRequest());
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('streakDays');
      expect(data).toHaveProperty('recentGoals');
    });

    it('should require authentication', async () => {
      (verifyToken as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/progress', {
        method: 'GET',
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    // New Streak Tests
    test('calculates streak correctly for today', async () => {
      const today = new Date();
      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: today },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(1);
    });

    test('calculates streak correctly for yesterday (streak maintained)', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: yesterday },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(1);
    });

    test('calculates streak of 3 days (today, yesterday, day before)', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: today },
        { startTime: yesterday },
        { startTime: dayBefore },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(3);
    });

    test('calculates streak of 3 days (yesterday, day before, day before that)', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayBeforeThat = new Date(today);
      dayBeforeThat.setDate(dayBeforeThat.getDate() - 3);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: yesterday },
        { startTime: dayBefore },
        { startTime: dayBeforeThat },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(3);
    });

    test('breaks streak if gap exists', async () => {
      const today = new Date();
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: today },
        { startTime: dayBefore },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(1);
    });

    test('handles multiple sessions per day correctly', async () => {
      const today = new Date();
      const todayLater = new Date(today.getTime() + 1000 * 60 * 60);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: todayLater },
        { startTime: today },
        { startTime: yesterday },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(2);
    });

    test('returns 0 streak if last session was 2 days ago', async () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { startTime: twoDaysAgo },
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.streakDays).toBe(0);
    });
  });
});
