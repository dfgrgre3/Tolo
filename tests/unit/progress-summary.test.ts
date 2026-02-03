
import { getProgressSummary } from '../../src/lib/server-data-fetch';
import { prisma } from '../../src/lib/db';
import { authService } from '../../src/lib/services/auth-service';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('../../src/lib/db', () => ({
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

jest.mock('../../src/lib/redis', () => ({
  CacheService: {
    getOrSet: jest.fn((key, fn) => fn()),
  },
}));

jest.mock('../../src/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('../../src/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'mock-token' }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  it('calculates stats correctly for basic sessions', async () => {
    const today = new Date();

    // Mock Aggregate response
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 90 },
      _avg: { focusScore: 85 }
    });

    // Mock findMany response (dates only, sorted desc)
    const sessions = [
      { createdAt: today },
      { createdAt: today }, // Multiple sessions same day
    ];
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(sessions);

    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 1,
    });

    // Verify parallel calls
    expect(prisma.studySession.aggregate).toHaveBeenCalled();
    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    }));
  });

  it('calculates streak correctly for multiple days', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Sorted desc
    const sessions = [
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: twoDaysAgo },
    ];

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 30 },
      _avg: { focusScore: 80 }
    });
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(sessions);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result?.streakDays).toBe(3);
  });

  it('calculates streak correctly with a gap', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Gap day (2 days ago missing)

    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Sorted desc
    const sessions = [
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: threeDaysAgo },
    ];

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 30 },
      _avg: { focusScore: 80 }
    });
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(sessions);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    // Streak should be 2 (Yesterday + Today)
    expect(result?.streakDays).toBe(2);
  });

  it('returns zeros when no sessions', async () => {
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
});
