
import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => {
      if (name === 'token') return { value: 'mock-token' };
      return undefined;
    }),
  })),
}));

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

  it('should calculate progress summary correctly with optimized fetching', async () => {
    // Mock aggregate response
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { durationMin: 135 },
      _avg: { focusScore: 80 },
    });

    // Mock findMany response (streak dates, desc order)
    const mockDates = [
      { createdAt: new Date('2023-10-27T10:00:00Z') },
      { createdAt: new Date('2023-10-26T10:00:00Z') },
      { createdAt: new Date('2023-10-25T10:00:00Z') },
    ];
    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockDates);

    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // Mock Date to control "today"
    const mockDate = new Date('2023-10-27T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 135,
      averageFocus: 80,
      tasksCompleted: 5,
      streakDays: 3,
    });

    // Verify optimized calls
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      _sum: { durationMin: true },
      _avg: { focusScore: true },
    });

    expect(prisma.studySession.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    expect(prisma.task.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'COMPLETED' },
    });
  });
});
