
import { getProgressSummary } from '@/lib/server-data-fetch';

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
    getOrSet: jest.fn(async (key, fn) => await fn()),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked dependencies to control them
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { authService } from '@/lib/services/auth-service';

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth mock
    (cookies as any).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'token-123' }),
    });
    (authService.verifyToken as any).mockResolvedValue({ userId: mockUserId });

    // Default mocks for prisma
    (prisma.task.count as any).mockResolvedValue(5);
  });

  it('should calculate stats correctly for multiple sessions', async () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Mock aggregate return
    (prisma.studySession.aggregate as any).mockResolvedValue({
      _sum: { durationMin: 90 },
      _avg: { focusScore: 85 },
    });

    // Mock findMany for dates (optimization: only dates returned)
    (prisma.studySession.findMany as any).mockResolvedValue([
      { createdAt: today },
      { createdAt: yesterday },
    ]);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 2,
    });

    // Verify optimized calls
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: mockUserId },
        _sum: { durationMin: true },
        _avg: { focusScore: true }
    }));

    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: mockUserId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' }
    }));
  });

  it('should return zeros for no sessions', async () => {
    // Mock aggregate returning nulls
    (prisma.studySession.aggregate as any).mockResolvedValue({
      _sum: { durationMin: null },
      _avg: { focusScore: null },
    });

    (prisma.studySession.findMany as any).mockResolvedValue([]);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 5,
      streakDays: 0,
    });
  });

  it('should handle gaps in streak', async () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    (prisma.studySession.aggregate as any).mockResolvedValue({
      _sum: { durationMin: 20 },
      _avg: { focusScore: 10 },
    });

    (prisma.studySession.findMany as any).mockResolvedValue([
      { createdAt: today },
      { createdAt: twoDaysAgo },
    ]);

    const result = await getProgressSummary();

    expect(result).toEqual({
        totalMinutes: 20,
        averageFocus: 10,
        tasksCompleted: 5,
        streakDays: 1
    });
  });
});
