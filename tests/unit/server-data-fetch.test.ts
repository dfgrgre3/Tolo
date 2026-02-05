import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';

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

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockImplementation((key) => {
      if (key === 'token') return { value: 'test-token' };
      return undefined;
    }),
  }),
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn().mockResolvedValue({ userId: 'user-1' }),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getProgressSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct summary using aggregate', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 90 },
        _avg: { focusScore: 85 }
    });

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mockDates = [
        { createdAt: today },
        { createdAt: yesterday }
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 2,
    });

    // Verify optimization calls
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith(expect.objectContaining({
        _sum: { durationMin: true },
        _avg: { focusScore: true }
    }));

    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' }
    }));
  });

   it('should calculate streak correctly for 3 consecutive days', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 30 },
        _avg: { focusScore: 10 }
    });

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

    // Descending order as per query
    const mockDates = [
        { createdAt: today },
        { createdAt: yesterday },
        { createdAt: dayBeforeYesterday },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result?.streakDays).toBe(3);
  });

  it('should handle broken streak', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 20 },
        _avg: { focusScore: 10 }
    });

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    // Skip yesterday
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const mockDates = [
        { createdAt: today },
        { createdAt: twoDaysAgo },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result?.streakDays).toBe(1);
  });

  it('should handle streak when studied yesterday but not today', async () => {
      (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 10 },
        _avg: { focusScore: 10 }
      });

      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockDates = [
          { createdAt: yesterday },
      ];

      (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
      (prisma.task.count as jest.Mock).mockResolvedValue(0);

      const result = await getProgressSummary();

      expect(result?.streakDays).toBe(1);
  });

  it('should handle empty sessions', async () => {
      (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: null },
        _avg: { focusScore: null }
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

  it('should return streak of last run even if broken long ago (legacy behavior check)', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 20 },
        _avg: { focusScore: 10 }
    });

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    fiveDaysAgo.setHours(10,0,0,0);

    const sixDaysAgo = new Date(fiveDaysAgo);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 1);

    const mockDates = [
        { createdAt: fiveDaysAgo },
        { createdAt: sixDaysAgo },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result?.streakDays).toBe(2);
  });
});
