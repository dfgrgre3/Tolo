import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { cookies } from 'next/headers';

// Mocks
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
    }
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

  it('should return default values if no user', async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const result = await getProgressSummary();

    expect(result).toEqual({
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });

  it('should fetch progress summary using optimized queries', async () => {
    // Setup auth
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'valid-token' }),
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

    // Setup DB responses for optimized method
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        totalStudyTime: 90,
        tasksCompleted: 5,
        currentStreak: 1,
    });
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
        _avg: { focusScore: 85 }
    });

    const result = await getProgressSummary();

    // Verify it called findUnique and aggregate
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
    );
    expect(prisma.studySession.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
    );

    // Verify it did NOT call the old inefficient methods
    expect(prisma.studySession.findMany).not.toHaveBeenCalled();

    // Verify result matches expected outcome
    expect(result).toEqual({
      totalMinutes: 90,
      averageFocus: 85,
      tasksCompleted: 5,
      streakDays: 1,
    });
  });
});
