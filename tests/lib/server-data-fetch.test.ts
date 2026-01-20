
import { getProgressSummary } from '../../src/lib/server-data-fetch';
import { prisma } from '../../src/lib/db';
import { authService } from '../../src/lib/services/auth-service';
import { CacheService } from '../../src/lib/redis';
import { cookies } from 'next/headers';

// Mock dependencies
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

jest.mock('../../src/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('../../src/lib/redis', () => ({
  CacheService: {
    getOrSet: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';
  const mockDate = new Date('2023-10-27T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Date mock for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    // Mock cookies
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockImplementation((name) => {
        if (name === 'token') return { value: 'valid-token' };
        return undefined;
      }),
    });

    // Mock auth
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });

    // Mock CacheService to just execute the callback
    (CacheService.getOrSet as jest.Mock).mockImplementation(async (key, callback) => {
      return await callback();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should calculate progress summary correctly', async () => {
    // Mock database responses

    // 1. Aggregation mock
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 135 }, // 30 + 60 + 45
      _avg: { focusScore: 85 },   // (80 + 90) / 2
    });

    // 2. Task count mock
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // 3. Streak dates mock - Ordered Descending (Latest first)
    const mockSessionDates = [
      { createdAt: new Date('2023-10-27T08:00:00Z') }, // Today
      { createdAt: new Date('2023-10-26T08:00:00Z') }, // Yesterday
      { createdAt: new Date('2023-10-25T08:00:00Z') }, // Day before yesterday
    ];
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockSessionDates);

    const result = await getProgressSummary();

    // Verify calls
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

    expect(result).toEqual({
      totalMinutes: 135,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 3,
    });
  });

  it('should handle empty sessions', async () => {
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: null },
      _avg: { focusScore: null },
    });
    (prisma.task.count as jest.Mock).mockResolvedValue(0);
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });
});
