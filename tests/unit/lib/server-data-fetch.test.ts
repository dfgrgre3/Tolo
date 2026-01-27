import { getProgressSummary } from '@/lib/server-data-fetch';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { cookies } from 'next/headers';

// Mocks
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
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
    getOrSet: jest.fn((key, fn) => fn()), // Execute immediately
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

// Mock logger to avoid noise
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getProgressSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockReturnValue({
      get: (name: string) => {
        if (name === 'token') return { value: 'valid-token' };
        return null;
      },
    });
    (authService.verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-123' });
  });

  it('should return progress summary using optimized queries', async () => {
    // Mock User data
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      currentStreak: 5,
    });

    // Mock Aggregation data
    (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
      _avg: { focusScore: 85.5 },
      _sum: { durationMin: 120 },
    });

    // Mock Task count
    (prisma.task.count as jest.Mock).mockResolvedValue(10);

    const summary = await getProgressSummary();

    // These expectations confirm we are using the optimized queries
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: expect.any(Object),
    });

    expect(prisma.studySession.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      _avg: { focusScore: true },
      _sum: { durationMin: true },
    });

    expect(summary).toEqual({
      totalMinutes: 120,
      averageFocus: 85.5,
      tasksCompleted: 10,
      streakDays: 5,
    });
  });

  it('should return defaults if user not found', async () => {
     (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
     (prisma.studySession.aggregate as jest.Mock).mockResolvedValue({
       _avg: { focusScore: null },
       _sum: { durationMin: null }
     });
     (prisma.task.count as jest.Mock).mockResolvedValue(0);

     const summary = await getProgressSummary();

     expect(summary).toEqual({
       totalMinutes: 0,
       averageFocus: 0,
       tasksCompleted: 0,
       streakDays: 0,
     });
  });
});
