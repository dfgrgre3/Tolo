import { GET as getQuests } from '@/app/api/gamification/quests/route';
import { GET as getChallenges } from '@/app/api/gamification/challenges/route';
import { GET as getLeaderboard } from '@/app/api/gamification/leaderboard/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    quest: {
      findMany: jest.fn(),
    },
    challenge: {
      findMany: jest.fn(),
    },
    leaderboardEntry: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/auth-service', () => ({
  authService: {
    verifyTokenFromRequest: jest.fn(),
  },
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/middleware/ops-middleware', () => ({
  opsWrapper: jest.fn((req, handler) => handler(req)),
}));

jest.mock('@/lib/services/advanced-gamification-service', () => ({
  advancedGamificationService: {
    getActiveQuestChains: jest.fn().mockResolvedValue([]),
    getQuestProgress: jest.fn().mockResolvedValue([]),
    getActiveChallenges: jest.fn().mockResolvedValue([]),
    getLeaderboard: jest.fn().mockResolvedValue([]),
  },
}));

describe('Gamification API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/gamification/quests', () => {
    it('should return available quests', async () => {
      const mockQuests = [
        {
          id: 'quest-1',
          title: 'Complete 10 Tasks',
          description: 'Finish 10 tasks to earn rewards',
          xpReward: 100,
        },
      ];

      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
      (prisma.quest.findMany as jest.Mock).mockResolvedValue(mockQuests);

      const request = new NextRequest(
        'http://localhost/api/gamification/quests',
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer test-token',
          },
        }
      );

      const response = await getQuests(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/gamification/challenges', () => {
    it('should return active challenges', async () => {
      const mockChallenges = [
        {
          id: 'challenge-1',
          title: 'Weekly Study Challenge',
          description: 'Study for 20 hours this week',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      const { verifyToken } = require('@/lib/services/auth-service');
      (verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
      });
      (prisma.challenge.findMany as jest.Mock).mockResolvedValue(
        mockChallenges
      );

      const request = new NextRequest(
        'http://localhost/api/gamification/challenges',
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer test-token',
          },
        }
      );

      const response = await getChallenges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/gamification/leaderboard', () => {
    it('should return leaderboard entries', async () => {
      const mockLeaderboard = [
        {
          userId: 'user-1',
          username: 'user1',
          totalXP: 1000,
          level: 5,
          rank: 1,
        },
        {
          userId: 'user-2',
          username: 'user2',
          totalXP: 800,
          level: 4,
          rank: 2,
        },
      ];

      (prisma.leaderboardEntry.findMany as jest.Mock).mockResolvedValue(
        mockLeaderboard
      );

      const request = new NextRequest(
        'http://localhost/api/gamification/leaderboard',
        {
          method: 'GET',
        }
      );

      const response = await getLeaderboard(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });
});

