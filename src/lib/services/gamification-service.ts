import { prisma } from '../db';
import { Prisma, User } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'study' | 'tasks' | 'exams' | 'time' | 'streak';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  requirements: Record<string, unknown>;
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

  /**
   * Get user progress with timeout protection and better error handling
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid user ID');
    }

    const trimmedUserId = userId.trim();

    // Try to get from cache first with timeout protection
    const cacheKey = `user_progress:${trimmedUserId}`;
    try {
      const cachePromise = this.getCachedProgress(cacheKey);
      const timeoutPromise = new Promise<UserProgress | null>((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2 second timeout
      });

      const cached = await Promise.race([cachePromise, timeoutPromise]);
      if (cached) return cached;
    } catch (cacheError) {
      // Log but continue - cache failure shouldn't block progress retrieval
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Cache retrieval failed, fetching from database:', cacheError);
      }
    }

    // Get from database with timeout protection
    const fetchPromise = prisma.user.findUnique({
      where: { id: trimmedUserId },
      include: {
        achievements: true,
        customGoals: true
      }
    });

    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
    });

    const user = await Promise.race([fetchPromise, timeoutPromise]);

    if (!user) {
      throw new Error('User not found');
    }

    const progress: UserProgress = {
      userId: trimmedUserId,
      totalXP: user.totalXP || 0,
      level: this.calculateLevel(user.totalXP || 0),
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalStudyTime: user.totalStudyTime || 0,
      tasksCompleted: user.tasksCompleted || 0,
      examsPassed: user.examsPassed || 0,
      achievements: (user.achievements || []).map(a => a.achievementKey).filter(Boolean),
      customGoals: (user.customGoals || []).map(g => ({
        id: g.id,
        userId: g.userId,
        title: g.title || '',
        description: g.description || undefined,
        targetValue: g.targetValue || 0,
        currentValue: g.currentValue || 0,
        unit: g.unit || '',
        category: g.category || '',
        isCompleted: Boolean(g.isCompleted),
        createdAt: g.createdAt,
        completedAt: g.completedAt || undefined
      }))
    };

    // Cache the result (non-blocking)
    this.setCachedProgress(cacheKey, progress).catch((error) => {
      // Log but don't block response
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Cache update failed:', error);
      }
    });

    return progress;
  }

  /**
   * Update user progress with timeout protection and better error handling
   */
  async updateUserProgress(userId: string, action: string, data: Record<string, unknown> = {}): Promise<UserProgress> {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid user ID');
    }

    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      throw new Error('Invalid action');
    }

    const trimmedUserId = userId.trim();
    const trimmedAction = action.trim();

    // Get user with timeout protection
    const findPromise = prisma.user.findUnique({ where: { id: trimmedUserId } });
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const user = await Promise.race([findPromise, timeoutPromise]);
    if (!user) {
      throw new Error('User not found');
    }

    const updates: Prisma.UserUpdateInput = {};
    let xpGained = 0;
    const newAchievements: string[] = [];

    switch (trimmedAction) {
      case 'study_session_completed': {
        const studyTime = Number(data.duration) || 0;
        if (studyTime < 0) {
          throw new Error('Study time cannot be negative');
        }
        if (studyTime > 1440) { // Max 24 hours in minutes
          throw new Error('Study time exceeds maximum allowed (24 hours)');
        }

        updates.totalStudyTime = (user.totalStudyTime || 0) + studyTime;

        // Calculate streak with timeout protection
        try {
          const streakPromise = this.calculateStreak(trimmedUserId);
          const streakTimeoutPromise = new Promise<number>((resolve) => {
            setTimeout(() => resolve(user.currentStreak || 0), 3000); // 3 second timeout, fallback to current streak
          });
          updates.currentStreak = await Promise.race([streakPromise, streakTimeoutPromise]);
        } catch (streakError) {
          // Fallback to current streak if calculation fails
          updates.currentStreak = user.currentStreak || 0;
        }

        updates.longestStreak = Math.max(user.longestStreak || 0, updates.currentStreak);

        // XP for study time (1 XP per 6 minutes)
        xpGained = Math.floor(studyTime / 6);

        // Track deep work sessions (sessions >= 60 minutes)
        if (studyTime >= 60) {
          const currentDeepWorkCount = (user.deepWorkSessions || 0) + 1;
          updates.deepWorkSessions = currentDeepWorkCount;

          // Check for deep work achievement (non-blocking)
          if (currentDeepWorkCount >= 5) {
            this.getUserProgress(trimmedUserId)
              .then((progress) => {
                if (!progress.achievements.includes('deep_work')) {
                  const achievement = this.achievements.get('deep_work');
                  if (achievement) {
                    this.unlockAchievement(trimmedUserId, achievement).catch((error) => {
                      logger.warn('Failed to unlock deep_work achievement:', error);
                    });
                  }
                }
              })
              .catch((error) => {
                logger.warn('Failed to check deep_work achievement:', error);
              });
          }
        }
      }
        break;

      case 'task_completed':
      case 'task_created':
        updates.tasksCompleted = (user.tasksCompleted || 0) + (trimmedAction === 'task_completed' ? 1 : 0);
        xpGained = trimmedAction === 'task_completed' ? 5 : 2; // Base XP for completing/creating a task
        break;

      case 'exam_completed': {
        const score = Number(data.score) || 0;
        if (score < 0 || score > 100) {
          throw new Error('Exam score must be between 0 and 100');
        }

        updates.examsPassed = (user.examsPassed || 0) + (score >= 60 ? 1 : 0);
        xpGained = Math.floor(score / 2); // XP based on score

        // Check for high score achievements (non-blocking)
        this.getUserProgress(trimmedUserId)
          .then((progress) => {
            if (score >= 90 && !progress.achievements.includes('exam_90_percent')) {
              const achievement = this.achievements.get('exam_90_percent');
              if (achievement) {
                this.unlockAchievement(trimmedUserId, achievement).catch((error) => {
                  logger.warn('Failed to unlock exam_90_percent achievement:', error);
                });
              }
            } else if (score >= 80 && !progress.achievements.includes('exam_80_percent')) {
              const achievement = this.achievements.get('exam_80_percent');
              if (achievement) {
                this.unlockAchievement(trimmedUserId, achievement).catch((error) => {
                  logger.warn('Failed to unlock exam_80_percent achievement:', error);
                });
              }
            }
          })
          .catch((error) => {
            logger.warn('Failed to check exam achievements:', error);
          });
        break;
      }

      case 'pomodoro_completed': {
        const pomodoroCount = (user.pomodoroSessions || 0) + 1;
        updates.pomodoroSessions = pomodoroCount;
        xpGained = 3;

        // Check for pomodoro master achievement (non-blocking)
        if (pomodoroCount >= 10) {
          this.getUserProgress(trimmedUserId)
            .then((progress) => {
              if (!progress.achievements.includes('pomodoro_master')) {
                const achievement = this.achievements.get('pomodoro_master');
                if (achievement) {
                  this.unlockAchievement(trimmedUserId, achievement).catch((error) => {
                    logger.warn('Failed to unlock pomodoro_master achievement:', error);
                  });
                }
              }
            })
            .catch((error) => {
              logger.warn('Failed to check pomodoro_master achievement:', error);
            });
        }
      }
        break;

      default:
        // Unknown action - log but don't throw
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`Unknown action: ${trimmedAction}`);
        }
        break;
    }

    // Update total XP (ensure non-negative)
    const newTotalXP = Math.max(0, (user.totalXP || 0) + xpGained);
    const newLevel = this.calculateLevel(newTotalXP);

    updates.totalXP = newTotalXP;
    updates.level = newLevel;

    // Update user in database with timeout protection
    const updatePromise = prisma.user.update({
      where: { id: trimmedUserId },
      data: updates
    });

    const updateTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database update timeout')), 10000);
    });

    await Promise.race([updatePromise, updateTimeoutPromise]);

    // Check for new achievements (non-blocking, in background)
    this.getUserProgress(trimmedUserId)
      .then((progress) => {
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

        // Process achievements in parallel (non-blocking)
        Promise.allSettled(
          achievementChecks
            .filter(check => check.condition && !progress.achievements.includes(check.key))
            .map(async (check) => {
              const achievement = this.achievements.get(check.key);
              if (achievement) {
                await this.unlockAchievement(trimmedUserId, achievement);
                newAchievements.push(check.key);
              }
            })
        ).catch((error) => {
          logger.warn('Error checking achievements:', error);
        });
      })
      .catch((error) => {
        logger.warn('Failed to check achievements:', error);
      });

    // Invalidate cache (non-blocking)
    this.invalidateProgressCache(trimmedUserId).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cache invalidation failed:', error);
      }
    });

    // Return updated progress with timeout protection
    try {
      const progressPromise = this.getUserProgress(trimmedUserId);
      const timeoutPromise = new Promise<UserProgress>((resolve, reject) => {
        setTimeout(() => reject(new Error('Progress retrieval timeout')), 5000);
      });

      return await Promise.race([progressPromise, timeoutPromise]);
    } catch (error) {
      // If progress retrieval fails, return a basic progress object
      return {
        userId: trimmedUserId,
        totalXP: newTotalXP,
        level: newLevel,
        currentStreak: typeof updates.currentStreak === 'number' ? updates.currentStreak : (user.currentStreak || 0),
        longestStreak: typeof updates.longestStreak === 'number' ? updates.longestStreak : (user.longestStreak || 0),
        totalStudyTime: typeof updates.totalStudyTime === 'number' ? updates.totalStudyTime : (user.totalStudyTime || 0),
        tasksCompleted: typeof updates.tasksCompleted === 'number' ? updates.tasksCompleted : (user.tasksCompleted || 0),
        examsPassed: typeof updates.examsPassed === 'number' ? updates.examsPassed : (user.examsPassed || 0),
        achievements: newAchievements.length > 0 ? newAchievements : [],
        customGoals: [],
      };
    }
  }

  private checkAchievement(user: User, achievementKey: string, data: Record<string, unknown>): Achievement | null {
    const achievement = this.achievements.get(achievementKey);
    if (!achievement) return null;

    // Simple check - in real implementation, this would be more sophisticated
    return achievement;
  }

  /**
   * Unlock achievement with timeout protection and better error handling
   */
  async unlockAchievement(userId: string, achievement: Achievement): Promise<void> {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid user ID');
    }

    if (!achievement || !achievement.key) {
      throw new Error('Invalid achievement');
    }

    const trimmedUserId = userId.trim();

    // Create achievement record with timeout protection
    const createPromise = prisma.userAchievement.create({
      data: {
        id: crypto.randomUUID(),
        userId: trimmedUserId,
        achievementKey: achievement.key,
        earnedAt: new Date()
      }
    });

    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 5000);
    });

    await Promise.race([createPromise, timeoutPromise]);

    // Invalidate cache (non-blocking)
    this.invalidateProgressCache(trimmedUserId).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cache invalidation failed:', error);
      }
    });
  }

  /**
   * Create custom goal with timeout protection and better validation
   */
  async createCustomGoal(userId: string, goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>): Promise<CustomGoal> {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid user ID');
    }

    if (!goalData || !goalData.title || goalData.title.trim().length === 0) {
      throw new Error('Goal title is required');
    }

    if (goalData.targetValue === undefined || goalData.targetValue <= 0) {
      throw new Error('Target value must be greater than 0');
    }

    const trimmedUserId = userId.trim();

    // Create goal with timeout protection
    const createPromise = prisma.customGoal.create({
      data: {
        id: crypto.randomUUID(),
        userId: trimmedUserId,
        title: goalData.title.trim(),
        description: goalData.description?.trim() || null,
        targetValue: goalData.targetValue,
        currentValue: goalData.currentValue || 0,
        unit: goalData.unit || '',
        category: goalData.category || '',
        isCompleted: false,
        createdAt: new Date()
      }
    });

    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 10000);
    });

    const goal = await Promise.race([createPromise, timeoutPromise]);

    // Invalidate cache (non-blocking)
    this.invalidateProgressCache(trimmedUserId).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cache invalidation failed:', error);
      }
    });

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

  /**
   * Update custom goal with timeout protection and better validation
   */
  async updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    // Validate inputs
    if (!goalId || typeof goalId !== 'string' || goalId.trim().length === 0) {
      throw new Error('Invalid goal ID');
    }

    if (currentValue < 0) {
      throw new Error('Current value cannot be negative');
    }

    const trimmedGoalId = goalId.trim();

    // Find goal with timeout protection
    const findPromise = prisma.customGoal.findUnique({ where: { id: trimmedGoalId } });
    const findTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const goal = await Promise.race([findPromise, findTimeoutPromise]);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const isCompleted = currentValue >= goal.targetValue;
    const updates: Prisma.CustomGoalUpdateInput = { currentValue };

    if (isCompleted && !goal.isCompleted) {
      updates.isCompleted = true;
      updates.completedAt = new Date();
    }

    // Update goal with timeout protection
    const updatePromise = prisma.customGoal.update({
      where: { id: trimmedGoalId },
      data: updates
    });

    const updateTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database update timeout')), 10000);
    });

    const updatedGoal = await Promise.race([updatePromise, updateTimeoutPromise]);

    // Invalidate cache (non-blocking)
    this.invalidateProgressCache(goal.userId).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Cache invalidation failed:', error);
      }
    });

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

  /**
   * Delete custom goal with timeout protection and better validation
   */
  async deleteCustomGoal(goalId: string): Promise<void> {
    // Validate inputs
    if (!goalId || typeof goalId !== 'string' || goalId.trim().length === 0) {
      throw new Error('Invalid goal ID');
    }

    const trimmedGoalId = goalId.trim();

    // Find goal with timeout protection
    const findPromise = prisma.customGoal.findUnique({ where: { id: trimmedGoalId } });
    const findTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const goal = await Promise.race([findPromise, findTimeoutPromise]);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const userId = goal.userId;

    // Delete goal with timeout protection
    const deletePromise = prisma.customGoal.delete({
      where: { id: trimmedGoalId }
    });

    const deleteTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database delete timeout')), 10000);
    });

    await Promise.race([deletePromise, deleteTimeoutPromise]);

    // Invalidate cache (non-blocking)
    this.invalidateProgressCache(userId).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Cache invalidation failed:', error);
      }
    });
  }

  /**
   * Get leaderboard with timeout protection and better validation
   */
  async getLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 50): Promise<LeaderboardEntry[]> {
    // Validate inputs
    if (!['global', 'friends'].includes(type)) {
      throw new Error('Invalid leaderboard type. Must be "global" or "friends"');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    const cacheKey = `leaderboard:${type}:${limit}`;

    // Try cache first with timeout protection
    try {
      const cachePromise = this.getCachedLeaderboard(cacheKey);
      const timeoutPromise = new Promise<LeaderboardEntry[] | null>((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2 second timeout
      });

      const cached = await Promise.race([cachePromise, timeoutPromise]);
      if (cached) return cached;
    } catch (cacheError) {
      // Log but continue - cache failure shouldn't block leaderboard retrieval
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cache retrieval failed, fetching from database:', cacheError);
      }
    }

    let whereClause = {};
    if (type === 'friends') {
      // For friends leaderboard, we'd need to implement friend relationships
      // For now, just return global
      whereClause = {};
    }

    // Fetch leaderboard with timeout protection
    const fetchPromise = prisma.user.findMany({
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

    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 15000); // 15 second timeout
    });

    const users = await Promise.race([fetchPromise, timeoutPromise]);

    const leaderboard: LeaderboardEntry[] = users.map((user, index) => ({
      userId: user.id,
      username: user.username || 'مستخدم مجهول',
      totalXP: user.totalXP || 0,
      level: this.calculateLevel(user.totalXP || 0),
      rank: index + 1,
      avatar: user.avatar || undefined
    }));

    // Cache the result (non-blocking)
    this.setCachedLeaderboard(cacheKey, leaderboard).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cache update failed:', error);
      }
    });

    return leaderboard;
  }

  private calculateLevel(totalXP: number): number {
    // Level calculation: each level requires 100 XP more than the previous
    // Level 1: 0-99 XP, Level 2: 100-299 XP, Level 3: 300-599 XP, etc.
    return Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 100)) / 2) + 1;
  }

  /**
   * Calculate streak with timeout protection
   */
  private async calculateStreak(userId: string): Promise<number> {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return 0;
    }

    const trimmedUserId = userId.trim();

    // Calculate streak based on consecutive days with study sessions
    const fetchPromise = prisma.studySession.findMany({
      where: { userId: trimmedUserId },
      orderBy: { startTime: 'desc' },
      take: 100 // Check last 100 sessions
    });

    const timeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    let sessions;
    try {
      sessions = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      // If query fails, return 0
      return 0;
    }

    if (sessions.length === 0) return 0;

    // Group sessions by day
    const sessionsByDay = new Map<string, boolean>();
    sessions.forEach(session => {
      const date = new Date(session.startTime);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      sessionsByDay.set(dayKey, true);
    });

    // Calculate consecutive days from today backwards
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

      if (sessionsByDay.has(dayKey)) {
        streak++;
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // If today has no session, check yesterday
        if (streak === 0 && currentDate.getTime() === new Date().setHours(0, 0, 0, 0)) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return streak;
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
