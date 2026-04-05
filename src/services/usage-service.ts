import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CacheService } from '@/lib/cache';

export class UsageService {

  /**
   * Helper: Get standardized Start of Month in UTC
   */
  private static getStartOfMonth() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  /**
   * Helper: Atomic Monthly Reset
   * Ensures counters are reset only once per month, even with concurrent requests.
   */
  private static async syncMonthlyReset(userId: string) {
    const startOfMonth = this.getStartOfMonth();
    
    await prisma.user.updateMany({
      where: { 
        id: userId, 
        OR: [
          { lastUsageReset: { lt: startOfMonth } },
          { lastUsageReset: null }
        ]
      },
      data: {
        monthlyExamCount: 0,
        monthlyAiMessageCount: 0,
        lastUsageReset: startOfMonth
      }
    });
  }

  /**
   * Check and deduct exam usage
   * Optimized for high concurrency and low latency.
   */
  static async useExam(userId: string, subjectId?: string) {
    // 1. Atomic Reset (FIRE FIRST to ensure consistency)
    await this.syncMonthlyReset(userId);

    // 2. Fetch User & Active Subscription (Optimized with Redis Caching)
    const cacheKey = `user:${userId}:usage-meta`;
    const user = await CacheService.getOrSet(cacheKey, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1
          }
        }
      });
    }, 300); // 5 min cache

    if (!user) throw new Error('User not found');

    // 3. Check direct additional credits (Atomic Update)
    const creditUpdate = await prisma.user.updateMany({
      where: { id: userId, additionalExamCredits: { gt: 0 } },
      data: { additionalExamCredits: { decrement: 1 } }
    });

    if (creditUpdate.count > 0) {
      this.trackUsage(userId, 'EXAM_CREDIT_USED', { subjectId }); // FIRE AND FORGET
      return { allowed: true, method: 'CREDIT' };
    }

    const activeSub = user.subscriptions[0];
    
    // 4. If subscribed, check plan limits
    if (activeSub && activeSub.plan.examLimit) {
      const limit = activeSub.plan.examLimit;
      
      // ATOMIC QUOTA CHECK & INCREMENT (The "Memory Cache" check is removed for safety)
      const updateResult = await prisma.user.updateMany({
        where: { id: userId, monthlyExamCount: { lt: limit } },
        data: { monthlyExamCount: { increment: 1 } }
      });

      if (updateResult.count > 0) {
        this.trackUsage(userId, 'EXAM_PLAN_USED', { subjectId }); // FIRE AND FORGET
        this.checkThresholds(userId, 'EXAM', limit); // FIRE AND FORGET
        return { allowed: true, method: 'PLAN_LIMIT' };
      }

      // 5. Hybrid Model: Check if extra usage is allowed (Requires Wallet Balance)
      const extraPrice = activeSub.plan.extraExamPrice || 0;
      if (extraPrice > 0) {
        try {
          await prisma.$transaction(async (tx) => {
            // Atomic decrement with balance check in DATABASE
            const walletUpdate = await tx.userWallet.updateMany({
              where: { userId, balance: { gte: extraPrice } },
              data: { balance: { decrement: extraPrice } }
            });

            if (walletUpdate.count === 0) throw new Error('INSUFFICIENT_BALANCE');

            await tx.payment.create({
              data: {
                userId,
                amount: extraPrice,
                status: 'SUCCESS',
                provider: 'USAGE_FEE',
                paymentMethod: 'wallet',
                paymentData: `Extra exam fee for user ${userId}`
              }
            });
          });

          this.trackUsage(userId, 'EXAM_WALLET_PAID', { price: extraPrice, subjectId }); // FIRE AND FORGET
          return { allowed: true, method: 'BALANCE_DEDUCTION', price: extraPrice };
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
            return { allowed: false, reason: 'INSUFFICIENT_BALANCE', required: extraPrice };
          }
          throw error;
        }
      }
    }

    if (!activeSub) return { allowed: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    return { allowed: false, reason: 'LIMIT_REACHED' };
  }

  /**
   * Check AI Message Usage
   */
  static async useAiMessage(userId: string) {
    await this.syncMonthlyReset(userId);

    // 1. Fetch User & Active Subscription (Cached)
    const cacheKey = `user:${userId}:usage-meta`;
    const user = await CacheService.getOrSet(cacheKey, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1
          }
        }
      });
    }, 300);

    if (!user) throw new Error('User not found');

    // 1. Atomic decrement for AI Credits
    const creditUpdate = await prisma.user.updateMany({
      where: { id: userId, additionalAiCredits: { gt: 0 } },
      data: { additionalAiCredits: { decrement: 1 } }
    });

    if (creditUpdate.count > 0) {
      this.trackUsage(userId, 'AI_CREDIT_USED'); // FIRE AND FORGET
      return { allowed: true };
    }

    const activeSub = user.subscriptions[0];
    if (activeSub && activeSub.plan.aiMessageLimit) {
      const limit = activeSub.plan.aiMessageLimit;

      const updateResult = await prisma.user.updateMany({
        where: { id: userId, monthlyAiMessageCount: { lt: limit } },
        data: { monthlyAiMessageCount: { increment: 1 } }
      });

      if (updateResult.count > 0) {
        this.trackUsage(userId, 'AI_PLAN_USED'); // FIRE AND FORGET
        this.checkThresholds(userId, 'AI', limit); // FIRE AND FORGET
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'AI_LIMIT_REACHED' };
  }

  /**
   * FIRE AND FORGET: Threshold Tracking & Notifications
   */
  private static async checkThresholds(userId: string, type: 'EXAM' | 'AI', limit: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyExamCount: true, monthlyAiMessageCount: true }
      }) as { monthlyExamCount: number; monthlyAiMessageCount: number } | null;

      if (!user) return;

      const current = type === 'EXAM' ? user.monthlyExamCount : user.monthlyAiMessageCount;
      const threshold = Math.floor(limit * 0.9);

      if (current === threshold) {
        const title = type === 'EXAM' ? 'تحذير: باقة الامتحانات' : 'تحذير: باقة الـ AI';
        const message = `لقد استهلكت %90 من باقتك (${current}/${limit}).`;
        this.notifyUser(userId, title, message);
      }
    } catch (err: unknown) {
      logger.error('Threshold check failed:', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * FIRE AND FORGET: Log Analytics Events
   */
  private static async trackUsage(userId: string, type: string, metadata?: object) {
    prisma.analyticsEvent.create({
      data: {
        userId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }
    }).catch(err => logger.error(`Analytics failed for ${userId}:`, err instanceof Error ? err.message : String(err)));
  }

  /**
   * FIRE AND FORGET: Send In-App Notification
   */
  private static async notifyUser(userId: string, title: string, message: string) {
    prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: 'WARNING'
      }
    }).catch(err => logger.error(`Notification failed for ${userId}:`, err instanceof Error ? err.message : String(err)));
  }
}
