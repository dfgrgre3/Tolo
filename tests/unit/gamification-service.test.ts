import { gamificationService } from '@/lib/services/gamification-service';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userAchievement: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    customGoal: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Gamification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserProgress', () => {
    it('should update user progress with XP', async () => {
      const mockUser = {
        id: 'user-1',
        totalXP: 90,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
        tasksCompleted: 0,
        examsPassed: 0,
        achievements: [],
        customGoals: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        totalXP: 110,
      });

      const result = await gamificationService.updateUserProgress('user-1', 'study', { xp: 20 });

      expect(result).toBeDefined();
      expect(result.totalXP).toBeGreaterThanOrEqual(90);
    });

    it('should handle progress update without errors', async () => {
      const mockUser = {
        id: 'user-1',
        totalXP: 10,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
        tasksCompleted: 0,
        examsPassed: 0,
        achievements: [],
        customGoals: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        totalXP: 30,
      });

      const result = await gamificationService.updateUserProgress('user-1', 'study', { xp: 20 });

      expect(result).toBeDefined();
    });
  });

  describe('getUserProgress', () => {
    it('should get user progress successfully', async () => {
      const mockUser = {
        id: 'user-1',
        totalXP: 1000,
        currentStreak: 5,
        longestStreak: 10,
        totalStudyTime: 1000,
        tasksCompleted: 50,
        examsPassed: 10,
        achievements: [],
        customGoals: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await gamificationService.getUserProgress('user-1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.totalXP).toBe(1000);
    });
  });

  describe('createCustomGoal', () => {
    it('should create a custom goal successfully', async () => {
      const goalData = {
        title: 'Complete 10 tasks',
        targetValue: 10,
        currentValue: 0,
        unit: 'tasks',
        category: 'tasks',
      };

      (prisma.customGoal.create as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        ...goalData,
        isCompleted: false,
        createdAt: new Date(),
      });

      const result = await gamificationService.createCustomGoal('user-1', goalData);

      expect(result).toBeDefined();
      expect(result.id).toBe('goal-1');
      expect(prisma.customGoal.create).toHaveBeenCalled();
    });
  });
});

