
import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    studySession: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    task: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/redis', () => ({
  CacheService: {
    getOrSet: jest.fn((key, fn) => fn()),
  },
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => {
      if (name === 'token') return { value: 'mock-token' };
      return undefined;
    }),
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  it('should return default values when user has no data', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: null },
      _avg: { focusScore: null },
    });
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });

  it('should correctly calculate summary with data', async () => {
    // Mock aggregate results
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 120 },
      _avg: { focusScore: 85.5 },
    });

    // Mock task count
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // Mock streak data (3 days streak: today, yesterday, day before)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: dayBefore },
    ]);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 120,
      averageFocus: 85.5,
      tasksCompleted: 5,
      streakDays: 3,
    });
  });

  it('should handle broken streaks', async () => {
    // Mock aggregate
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 60 },
      _avg: { focusScore: 80 },
    });
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Only studied today and 3 days ago -> streak should be 1
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: today },
      { createdAt: threeDaysAgo },
    ]);

    const result = await getProgressSummary();

    expect(result!.streakDays).toBe(1);
  });

  it('should handle streak when studied yesterday but not today', async () => {
      // Mock aggregate
      (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 60 },
        _avg: { focusScore: 80 },
      });
      (prisma.task.count as jest.Mock).mockResolvedValue(0);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      // Studied yesterday and dayBefore -> streak should be 2?
      // Wait, standard streak logic usually allows keeping streak if you missed today but studied yesterday?
      // Logic in server-data-fetch.ts originally checked "studied today OR yesterday".
      // If today is missed, but yesterday was hit, streak is valid.

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
        { createdAt: yesterday },
        { createdAt: dayBefore },
      ]);

      const result = await getProgressSummary();

      expect(result!.streakDays).toBe(2);
    });
});
