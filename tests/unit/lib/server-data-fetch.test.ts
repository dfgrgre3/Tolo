import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { cookies } from 'next/headers';

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

  it('should return progress summary using optimizations', async () => {
    // Mock authenticated user
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'valid-token' }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-123' });

    // Mock DB responses
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _avg: { focusScore: 85 },
      _sum: { durationMin: 120 },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Mock sessions for streak calculation
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: twoDaysAgo },
    ]);

    (prisma.task.count as jest.Mock).mockResolvedValue(10);

    const result = await getProgressSummary();

    // Verify optimized calls
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      _avg: { focusScore: true },
      _sum: { durationMin: true },
    });

    // Verify streak fetch optimization
    expect(prisma.studySession.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100, // Optimization: only fetch recent sessions
    });

    expect(prisma.task.count).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'COMPLETED' },
    });

    // Verify result
    expect(result).toEqual({
      totalMinutes: 120,
      averageFocus: 85,
      tasksCompleted: 10,
      streakDays: 3, // Calculated from sessions
    });
  });

  it('should handle missing data gracefully', async () => {
     // Mock authenticated user
     (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'valid-token' }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-123' });

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _avg: { focusScore: null },
      _sum: { durationMin: null }
    });

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    // Check behavior when user not found or no data
    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });
});
