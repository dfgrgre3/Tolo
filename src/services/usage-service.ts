import { prisma } from '@/lib/db';

export class UsageService {
  /**
   * Check and deduct exam usage
   * Returns { allowed: boolean, reason?: string }
   */
  static async useExam(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1
        }
      }
    });

    if (!user) throw new Error('User not found');

    const activeSub = user.subscriptions[0];
    
    // 1. Check direct additional credits
    if (user.additionalExamCredits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { additionalExamCredits: { decrement: 1 } }
      });
      return { allowed: true, method: 'CREDIT' };
    }

    // 2. If subscribed, check plan limits
    if (activeSub && activeSub.plan.examLimit) {
      // Calculate exams taken this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const examsTaken = await prisma.examResult.count({
        where: {
          userId,
          takenAt: { gte: startOfMonth }
        }
      });

      if (examsTaken < activeSub.plan.examLimit) {
        return { allowed: true, method: 'PLAN_LIMIT' };
      }

      // 3. Beyond plan limit? Check if extra usage is allowed (Hybrid Model)
      const extraPrice = activeSub.plan.extraExamPrice || 0;
      if (extraPrice > 0) {
        if ((user.wallet?.balance ?? 0) >= extraPrice) {
          await prisma.$transaction(async (tx) => {
            await tx.userWallet.upsert({
              where: { userId },
              update: { balance: { decrement: extraPrice } },
              create: {
                userId,
                balance: 0,
              },
            });

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

          return { allowed: true, method: 'BALANCE_DEDUCTION', price: extraPrice };
        } else {
          return { allowed: false, reason: 'INSUFFICIENT_BALANCE', required: extraPrice };
        }
      }
    }

    // 4. Default for free users or no limits set
    if (!activeSub) {
        return { allowed: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }

    return { allowed: false, reason: 'LIMIT_REACHED' };
  }

  /**
   * Check AI Message Usage
   */
  static async useAiMessage(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1
          }
        }
      });
  
      if (!user) throw new Error('User not found');

      if (user.additionalAiCredits > 0) {
        await prisma.user.update({
            where: { id: userId },
            data: { additionalAiCredits: { decrement: 1 } }
        });
        return { allowed: true };
      }

      const activeSub = user.subscriptions[0];
      if (activeSub && activeSub.plan.aiMessageLimit) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const messagesSent = await prisma.aiChatMessage.count({
            where: {
                userId,
                createdAt: { gte: startOfMonth }
            }
        });

        if (messagesSent < activeSub.plan.aiMessageLimit) {
            return { allowed: true };
        }
      }

      return { allowed: false, reason: 'AI_LIMIT_REACHED' };
  }
}
