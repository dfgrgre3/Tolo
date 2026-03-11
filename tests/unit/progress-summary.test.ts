import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/redis';
import { cookies } from 'next/headers';
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
    getOrSet: jest.fn(),
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

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookies to return a token
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'valid-token' }),
    });

    // Mock authService to verify token
    (authService.verifyToken as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });

    // Mock CacheService to just execute the callback
    (CacheService.getOrSet as jest.Mock).mockImplementation(async (key, callback) => {
      return callback();
    });
  });

  it('should calculate progress summary correctly', async () => {
    // Setup mock data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Mock Prisma aggregate
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 90 },
      _avg: { focusScore: 85 },
    });

    // Mock Prisma findMany (streak calculation - expected desc order)
    const streakSessions = [
      { createdAt: today },
      { createdAt: yesterday },
    ];
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(streakSessions);

    // Mock Prisma task count
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 2, // Yesterday + Today = 2
    });

    // Verify aggregate was called correctly
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      _sum: { durationMin: true },
      _avg: { focusScore: true },
    });

    // Verify findMany was called correctly for streak
    expect(prisma.studySession.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should handle empty sessions', async () => {
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
});
