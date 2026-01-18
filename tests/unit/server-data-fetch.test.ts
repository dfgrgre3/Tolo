
import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    studySession: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
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
  cookies: jest.fn(),
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

  it('should return default values if no user is authenticated', async () => {
    (cookies as any).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });

  it('should return calculated stats and streak', async () => {
    // Mock user authentication
    (cookies as any).mockResolvedValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === 'token') return { value: 'valid-token' };
        return undefined;
      }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    // Mock DB responses
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 120 },
      _avg: { focusScore: 85 },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(yesterday);
    dayBefore.setDate(dayBefore.getDate() - 1);

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: dayBefore },
    ]);

    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 120,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 3,
    });
  });

  it('should handle streak broken correctly', async () => {
    (cookies as any).mockResolvedValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === 'token') return { value: 'valid-token' };
        return undefined;
      }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 100 },
      _avg: { focusScore: 80 },
    });

    const today = new Date();
    const gapDay = new Date(today);
    gapDay.setDate(gapDay.getDate() - 3); // Gap of 2 days

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: today },
      { createdAt: gapDay },
    ]);

    (prisma.task.count as jest.Mock).mockResolvedValue(2);

    const result = await getProgressSummary();

    expect(result).toEqual({
        totalMinutes: 100,
        averageFocus: 80,
        tasksCompleted: 2,
        streakDays: 1, // Only today counts
    });
  });

  it('should handle zero sessions', async () => {
    (cookies as any).mockResolvedValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === 'token') return { value: 'valid-token' };
        return undefined;
      }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: null }, // Prisma returns null for sum if no records
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

  it('should calculate streak when latest session was yesterday', async () => {
     (cookies as any).mockResolvedValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === 'token') return { value: 'valid-token' };
        return undefined;
      }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 60 },
      _avg: { focusScore: 90 },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: yesterday },
    ]);

    (prisma.task.count as jest.Mock).mockResolvedValue(1);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 60,
      averageFocus: 90,
      tasksCompleted: 1,
      streakDays: 1,
    });
  });
});
