
import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
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
    getOrSet: jest.fn((key, fn) => fn()), // Bypass cache for testing logic
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

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth mock
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'valid-token' }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  it('should calculate progress correctly using optimized queries', async () => {
    // Mock Data
    // Session 1: Today, 60 min, 80 focus
    // Session 2: Yesterday, 30 min, 90 focus
    // Session 3: Yesterday (dup day), 20 min, 85 focus
    // Session 4: Day Before Yesterday (gap of 1 day? No, consecutive), let's say 2 days ago.

    // Actually aggregate handles math.
    const mockAggregates = {
      _sum: { durationMin: 135 },
      _avg: { focusScore: 85 },
    };

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const mockDates = [
      { createdAt: today },
      { createdAt: yesterday },
      { createdAt: yesterday }, // duplicate day check
      { createdAt: dayBeforeYesterday },
    ];

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue(mockAggregates);
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    const result = await getProgressSummary();

    // Check Calls
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      _sum: { durationMin: true },
      _avg: { focusScore: true },
    });

    expect(prisma.studySession.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    expect(prisma.task.count).toHaveBeenCalledWith({
      where: { userId: mockUserId, status: 'COMPLETED' },
    });

    expect(result?.totalMinutes).toBe(135);
    expect(result?.averageFocus).toBe(85);
    expect(result?.tasksCompleted).toBe(5);
    expect(result?.streakDays).toBe(3); // Today, Yesterday, DayBeforeYesterday
  });

  it('should handle null averages and sums', async () => {
    const mockAggregates = {
      _sum: { durationMin: null },
      _avg: { focusScore: null },
    };

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue(mockAggregates);
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    expect(result?.totalMinutes).toBe(0);
    expect(result?.averageFocus).toBe(0);
    expect(result?.streakDays).toBe(0);
  });

  it('verifies current streak behavior for old sessions (preserved behavior)', async () => {
    // Session from 5 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 5);

    const mockDates = [
      { createdAt: oldDate },
    ];

    const mockAggregates = {
      _sum: { durationMin: 60 },
      _avg: { focusScore: 80 },
    };

    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue(mockAggregates);
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);
    (prisma.task.count as jest.Mock).mockResolvedValue(0);

    const result = await getProgressSummary();

    // Still expects 1 as per preserved behavior
    expect(result?.streakDays).toBe(1);
  });
});
