import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
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
    user: {
      findUnique: jest.fn(),
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

describe('getProgressSummary', () => {
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup generic cookie mock
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({
      get: jest.fn().mockImplementation((name) => {
        if (name === 'token') return { value: 'mock-token' };
        return undefined;
      }),
    });

    // Setup auth service mock
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  it('should calculate progress summary correctly using optimized queries', async () => {
    // Mock user stats
    const mockUser = {
      totalStudyTime: 120,
      tasksCompleted: 10,
      currentStreak: 5,
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Mock aggregation
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _avg: { focusScore: 85 },
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 120,
      averageFocus: 85,
      tasksCompleted: 10,
      streakDays: 5,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
      select: expect.objectContaining({
        totalStudyTime: true,
        tasksCompleted: true,
        currentStreak: true,
      }),
    });

    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      _avg: { focusScore: true },
    });
  });

  it('should handle null values correctly', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
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
