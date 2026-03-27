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
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should calculate progress summary correctly', async () => {
    // Mock user ID from cookies/auth
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => {
        if (name === 'token') return { value: 'valid-token' };
        return null;
      },
    });

    (authService.verifyToken as jest.Mock).mockResolvedValue({
      userId: 'user-123',
    });

    // Mock Date to control "Today"
    // Using a fixed date: 2023-10-27 (Friday)
    const mockToday = new Date('2023-10-27T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(mockToday);

    // Mock sessions for finding
    // 3 consecutive days ending on today
    // New implementation expects descending order
    const mockSessions = [
      {
        createdAt: new Date('2023-10-27T08:00:00Z'), // Today
      },
      {
        createdAt: new Date('2023-10-26T10:00:00Z'), // Yesterday
      },
      {
        createdAt: new Date('2023-10-25T10:00:00Z'), // Day -2
      },
    ];

    (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockSessions);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);

    // Mock aggregate for the FUTURE implementation
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _sum: { durationMin: 135 },
        _avg: { focusScore: 85 }
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 135,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 3,
    });
  });
});
