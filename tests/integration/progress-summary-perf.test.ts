
import { getProgressSummary } from '../../src/lib/server-data-fetch';
import { prisma } from '../../src/lib/db';
import { authService } from '../../src/lib/services/auth-service';

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
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/lib/redis', () => ({
  CacheService: {
    getOrSet: jest.fn(async (key, fn) => await fn()),
  },
}));

jest.mock('../../src/lib/services/auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: 'mock-token' }),
  }),
}));

describe('getProgressSummary', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  it('should calculate progress summary correctly (optimized behavior)', async () => {
    // Mock for optimized implementation
    // Mock User for denormalized fields
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      totalStudyTime: 90,
      currentStreak: 2,
      tasksCompleted: 5,
    });

    // Mock Aggregate for average focus
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _avg: {
        focusScore: 85,
      },
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 2,
    });

    // Verify optimized calling patterns
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
      select: {
        totalStudyTime: true,
        currentStreak: true,
        tasksCompleted: true,
      },
    });

    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      _avg: {
        focusScore: true,
      },
    });

    // Verify legacy calls are NOT made
    expect(prisma.studySession.findMany).not.toHaveBeenCalled();
    expect(prisma.task.count).not.toHaveBeenCalled();
  });
});
