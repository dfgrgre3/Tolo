import { prisma } from './prisma';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'study' | 'tasks' | 'exams' | 'time' | 'streak';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  requirements: Record<string, any>;
  isSecret?: boolean;
}

export interface UserProgress {
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  achievements: string[];
  customGoals: CustomGoal[];
}

export interface CustomGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  rank: number;
  avatar?: string;
}

export class GamificationService {
  private static instance: GamificationService;
  private achievements: Map<string, Achievement> = new Map();

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  constructor() {
    this.initializeAchievements();
  }

  private initializeAchievements() {
    const achievementDefinitions: Achievement[] = [
      // Study Achievements
      {
        id: 'first_study_session',
        key: 'first_study_session',
        title: 'أول جلسة دراسة',
        description: 'أكملت أول جلسة دراسة لك',
        icon: '📚',
        category: 'study',
        difficulty: 'easy',
        xpReward: 10,
        requirements: { studySessions: 1 }
      },
      {
        id: 'study_10_hours',
        key: 'study_10_hours',
        title: '10 ساعات دراسة',
        description: 'درست لمدة 10 ساعات إجمالية',
        icon: '⏰',
        category: 'study',
        difficulty: 'medium',
        xpReward: 50,
        requirements: { totalStudyTime: 600 } // 10 hours in minutes
      },
      {
        id: 'study_50_hours',
        key: 'study_50_hours',
        title: '50 ساعة دراسة',
        description: 'درست لمدة 50 ساعة إجمالية',
        icon: '🎓',
        category: 'study',
        difficulty: 'hard',
        xpReward: 200,
        requirements: { totalStudyTime: 3000 } // 50 hours in minutes
      },
      {
        id: 'study_100_hours',
        key: 'study_100_hours',
        title: '100 ساعة دراسة',
        description: 'درست لمدة 100 ساعة إجمالية',
        icon: '🏆',
        category: 'study',
        difficulty: 'expert',
        xpReward: 500,
        requirements: { totalStudyTime: 6000 } // 100 hours in minutes
      },

      // Streak Achievements
      {
        id: 'week_streak',
        key: 'week_streak',
        title: 'أسبوع متتالي',
        description: 'درست 7 أيام متتالية',
        icon: '🔥',
        category: 'streak',
        difficulty: 'medium',
        xpReward: 100,
        requirements: { currentStreak: 7 }
      },
      {
        id: 'month_streak',
        key: 'month_streak',
        title: 'شهر متتالي',
        description: 'درست 30 يوم متتالي',
        icon: '🌟',
        category: 'streak',
        difficulty: 'expert',
        xpReward: 300,
        requirements: { currentStreak: 30 }
      },

      // Task Achievements
      {
        id: 'complete_10_tasks',
        key: 'complete_10_tasks',
        title: '10 مهام مكتملة',
        description: 'أكملت 10 مهام',
        icon: '✅',
        category: 'tasks',
        difficulty: 'easy',
        xpReward: 25,
        requirements: { tasksCompleted: 10 }
      },
      {
        id: 'complete_50_tasks',
        key: 'complete_50_tasks',
        title: '50 مهمة مكتملة',
        description: 'أكملت 50 مهمة',
        icon: '🎯',
        category: 'tasks',
        difficulty: 'medium',
        xpReward: 100,
        requirements: { tasksCompleted: 50 }
      },
      {
        id: 'complete_100_tasks',
        key: 'complete_100_tasks',
        title: '100 مهمة مكتملة',
        description: 'أكملت 100 مهمة',
        icon: '💎',
        category: 'tasks',
        difficulty: 'hard',
        xpReward: 250,
        requirements: { tasksCompleted: 100 }
      },

      // Exam Achievements
      {
        id: 'first_exam_pass',
        key: 'first_exam_pass',
        title: 'أول امتحان ناجح',
        description: 'اجتزت أول امتحان لك',
        icon: '🎉',
        category: 'exams',
        difficulty: 'easy',
        xpReward: 30,
        requirements: { examsPassed: 1 }
      },
      {
        id: 'exam_80_percent',
        key: 'exam_80_percent',
        title: 'نتيجة 80%',
        description: 'حصلت على 80% أو أعلى في امتحان',
        icon: '⭐',
        category: 'exams',
        difficulty: 'medium',
        xpReward: 75,
        requirements: { examScore: 80 }
      },
      {
        id: 'exam_90_percent',
        key: 'exam_90_percent',
        title: 'نتيجة 90%',
        description: 'حصلت على 90% أو أعلى في امتحان',
        icon: '🌟',
        category: 'exams',
        difficulty: 'hard',
        xpReward: 150,
        requirements: { examScore: 90 }
      },

      // Time-based Achievements
      {
        id: 'pomodoro_master',
        key: 'pomodoro_master',
        title: 'سيد البومودورو',
        description: 'أكملت 10 جلسات بومودورو',
        icon: '🍅',
        category: 'time',
        difficulty: 'medium',
        xpReward: 80,
        requirements: { pomodoroSessions: 10 }
      },
      {
        id: 'deep_work',
        key: 'deep_work',
        title: 'عمل عميق',
        description: 'أكملت 5 جلسات دراسة عميقة (ساعة أو أكثر)',
        icon: '🧠',
        category: 'time',
        difficulty: 'hard',
        xpReward: 120,
        requirements: { deepWorkSessions: 5 }
      }
    ];

    achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.key, achievement);
    });
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    // Try to get from cache first
    const cacheKey = `user_progress:${userId}`;
    const cached = await this.getCachedProgress(cacheKey);
    if (cached) return cached;

    // Get from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        customGoals: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const progress: UserProgress = {
      userId,
      totalXP: user.totalXP || 0,
      level: this.calculateLevel(user.totalXP || 0),
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalStudyTime: user.totalStudyTime || 0,
      tasksCompleted: user.tasksCompleted || 0,
      examsPassed: user.examsPassed || 0,
      achievements: user.achievements.map(a => a.achievementKey),
      customGoals: user.customGoals.map(g => ({
        id: g.id,
        userId: g.userId,
        title: g.title,
        description: g.description || undefined,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        unit: g.unit,
        category: g.category,
        isCompleted: g.isCompleted,
        createdAt: g.createdAt,
        completedAt: g.completedAt || undefined
      }))
    };

    // Cache the result
    await this.setCachedProgress(cacheKey, progress);
    return progress;
  }

  async updateUserProgress(userId: string, action: string, data: Record<string, any> = {}): Promise<UserProgress> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    let updates: any = {};
    let xpGained = 0;
    const newAchievements: string[] = [];

    switch (action) {
      case 'study_session_completed':
        const studyTime = data.duration || 0;
        updates.totalStudyTime = (user.totalStudyTime || 0) + studyTime;
        updates.currentStreak = await this.calculateStreak(userId);
        updates.longestStreak = Math.max(user.longestStreak || 0, updates.currentStreak);

        // XP for study time (1 XP per 6 minutes)
        xpGained = Math.floor(studyTime / 6);

        // Check for deep work session
        if (studyTime >= 60) {
          const deepWorkAchievement = this.checkAchievement(user, 'deep_work', { deepWorkSessions: (user.deepWorkSessions || 0) + 1 });
          if (deepWorkAchievement) newAchievements.push(deepWorkAchievement.key);
        }
        break;

      case 'task_completed':
        updates.tasksCompleted = (user.tasksCompleted || 0) + 1;
        xpGained = 5; // Base XP for completing a task
        break;

      case 'exam_completed':
        const score = data.score || 0;
        updates.examsPassed = (user.examsPassed || 0) + (score >= 60 ? 1 : 0);
        xpGained = Math.floor(score / 2); // XP based on score

        // Check for high score achievements
        if (score >= 90) {
          const highScoreAchievement = this.checkAchievement(user, 'exam_90_percent', { examScore: score });
          if (highScoreAchievement) newAchievements.push(highScoreAchievement.key);
        } else if (score >= 80) {
          const goodScoreAchievement = this.checkAchievement(user, 'exam_80_percent', { examScore: score });
          if (goodScoreAchievement) newAchievements.push(goodScoreAchievement.key);
        }
        break;

      case 'pomodoro_completed':
        const pomodoroCount = (user.pomodoroSessions || 0) + 1;
        updates.pomodoroSessions = pomodoroCount;
        xpGained = 3;

        // Check for pomodoro master achievement
        if (pomodoroCount >= 10) {
          const pomodoroAchievement = this.checkAchievement(user, 'pomodoro_master', { pomodoroSessions: pomodoroCount });
          if (pomodoroAchievement) newAchievements.push(pomodoroAchievement.key);
        }
        break;
    }

    // Update total XP
    updates.totalXP = (user.totalXP || 0) + xpGained;
    updates.level = this.calculateLevel(updates.totalXP);

    // Update user in database
    await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    // Check for new achievements
    const progress = await this.getUserProgress(userId);
    const achievementChecks = [
      { key: 'first_study_session', condition: progress.totalStudyTime > 0 },
      { key: 'study_10_hours', condition: progress.totalStudyTime >= 600 },
      { key: 'study_50_hours', condition: progress.totalStudyTime >= 3000 },
      { key: 'study_100_hours', condition: progress.totalStudyTime >= 6000 },
      { key: 'week_streak', condition: progress.currentStreak >= 7 },
      { key: 'month_streak', condition: progress.currentStreak >= 30 },
      { key: 'complete_10_tasks', condition: progress.tasksCompleted >= 10 },
      { key: 'complete_50_tasks', condition: progress.tasksCompleted >= 50 },
      { key: 'complete_100_tasks', condition: progress.tasksCompleted >= 100 },
      { key: 'first_exam_pass', condition: progress.examsPassed >= 1 }
    ];

    for (const check of achievementChecks) {
      if (check.condition && !progress.achievements.includes(check.key)) {
        const achievement = this.achievements.get(check.key);
        if (achievement) {
          await this.unlockAchievement(userId, achievement);
          newAchievements.push(check.key);
        }
      }
    }

    // Invalidate cache
    await this.invalidateProgressCache(userId);

    return await this.getUserProgress(userId);
  }

  private checkAchievement(user: any, achievementKey: string, data: Record<string, any>): Achievement | null {
    const achievement = this.achievements.get(achievementKey);
    if (!achievement) return null;

    // Simple check - in real implementation, this would be more sophisticated
    return achievement;
  }

  async unlockAchievement(userId: string, achievement: Achievement): Promise<void> {
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementKey: achievement.key,
        earnedAt: new Date()
      }
    });

    // Invalidate cache
    await this.invalidateProgressCache(userId);
  }

  async createCustomGoal(userId: string, goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>): Promise<CustomGoal> {
    const goal = await prisma.customGoal.create({
      data: {
        userId,
        ...goalData,
        isCompleted: false,
        createdAt: new Date()
      }
    });

    await this.invalidateProgressCache(userId);

    return {
      id: goal.id,
      userId: goal.userId,
      title: goal.title,
      description: goal.description || undefined,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      category: goal.category,
      isCompleted: goal.isCompleted,
      createdAt: goal.createdAt,
      completedAt: goal.completedAt || undefined
    };
  }

  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    const goal = await prisma.customGoal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error('Goal not found');

    const isCompleted = currentValue >= goal.targetValue;
    const updates: any = { currentValue };

    if (isCompleted && !goal.isCompleted) {
      updates.isCompleted = true;
      updates.completedAt = new Date();
    }

    const updatedGoal = await prisma.customGoal.update({
      where: { id: goalId },
      data: updates
    });

    await this.invalidateProgressCache(goal.userId);

    return {
      id: updatedGoal.id,
      userId: updatedGoal.userId,
      title: updatedGoal.title,
      description: updatedGoal.description || undefined,
      targetValue: updatedGoal.targetValue,
      currentValue: updatedGoal.currentValue,
      unit: updatedGoal.unit,
      category: updatedGoal.category,
      isCompleted: updatedGoal.isCompleted,
      createdAt: updatedGoal.createdAt,
      completedAt: updatedGoal.completedAt || undefined
    };
  }

  async deleteCustomGoal(goalId: string): Promise<void> {
    const goal = await prisma.customGoal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error('Goal not found');

    await prisma.customGoal.delete({
      where: { id: goalId }
    });

    await this.invalidateProgressCache(goal.userId);
  }

  async getLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 50): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${type}:${limit}`;

    // Try cache first
    const cached = await this.getCachedLeaderboard(cacheKey);
    if (cached) return cached;

    let whereClause = {};
    if (type === 'friends') {
      // For friends leaderboard, we'd need to implement friend relationships
      // For now, just return global
      whereClause = {};
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        totalXP: true,
        level: true,
        avatar: true
      },
      orderBy: { totalXP: 'desc' },
      take: limit
    });

    const leaderboard: LeaderboardEntry[] = users.map((user, index) => ({
      userId: user.id,
      username: user.username || 'مستخدم مجهول',
      totalXP: user.totalXP || 0,
      level: this.calculateLevel(user.totalXP || 0),
      rank: index + 1,
      avatar: user.avatar || undefined
    }));

    // Cache the result
    await this.setCachedLeaderboard(cacheKey, leaderboard);
    return leaderboard;
  }

  private calculateLevel(totalXP: number): number {
    // Level calculation: each level requires 100 XP more than the previous
    // Level 1: 0-99 XP, Level 2: 100-299 XP, Level 3: 300-599 XP, etc.
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  private async calculateStreak(userId: string): Promise<number> {
    // This would implement streak calculation based on study sessions
    // For now, return a placeholder
    return 1;
  }

  private async getCachedProgress(key: string): Promise<UserProgress | null> {
    // Implement Redis caching
    return null;
  }

  private async setCachedProgress(key: string, progress: UserProgress): Promise<void> {
    // Implement Redis caching
  }

  private async getCachedLeaderboard(key: string): Promise<LeaderboardEntry[] | null> {
    // Implement Redis caching
    return null;
  }

  private async setCachedLeaderboard(key: string, leaderboard: LeaderboardEntry[]): Promise<void> {
    // Implement Redis caching
  }

  private async invalidateProgressCache(userId: string): Promise<void> {
    // Invalidate user progress cache
  }

  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getAchievement(key: string): Achievement | undefined {
    return this.achievements.get(key);
  }
}

export const gamificationService = GamificationService.getInstance();
