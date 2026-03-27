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
    getOrSet: jest.fn((key, fetchFn) => fetchFn()),
  },
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((key) => {
      if (key === 'token') return { value: 'mock-token' };
      return null;
    }),
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('getProgressSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate progress summary correctly', async () => {
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    const today = new Date();
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));

    // Mock sessions data in DESC order as requested by the optimized query
    const sessions = [
      { durationMin: 60, focusScore: 80, createdAt: today },
      { durationMin: 30, focusScore: 90, createdAt: yesterday },
      { durationMin: 45, focusScore: 70, createdAt: twoDaysAgo },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(sessions);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // Mock aggregate
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 135 },
      _avg: { focusScore: 80 },
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 135,
      averageFocus: 80,
      tasksCompleted: 5,
      streakDays: 3,
    });

    // Verify aggregate was called
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      _sum: { durationMin: true },
      _avg: { focusScore: true }
    }));
  });

  it('should handle broken streak', async () => {
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    const today = new Date();
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));

    // Mock sessions data in DESC order
    const sessions = [
      { durationMin: 60, focusScore: 80, createdAt: today },
      { durationMin: 45, focusScore: 70, createdAt: twoDaysAgo },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(sessions);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // Mock aggregate
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 105 },
      _avg: { focusScore: 75 },
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 105,
      averageFocus: 75,
      tasksCompleted: 5,
      streakDays: 1, // Only today
    });
  });

  it('should handle empty sessions', async () => {
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: null },
      _avg: { focusScore: null },
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });
});
