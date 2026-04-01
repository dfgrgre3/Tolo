import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class ReferralService {
  /**
   * Generate a unique referral code for a user
   */
  static async generateCode(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.referralCode) return user.referralCode;

    // Create a 6-character readable code from UUID or initials
    const code = uuidv4().split('-')[0].toUpperCase();
    
    return await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { referralCode: true }
    });
  }

  /**
   * Process a referral reward when a user makes their first successful payment
   */
  static async processReferralReward(userId: string, paymentAmount: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true }
    });

    if (!user?.referredById) return;
    const referrerId = user.referredById;

    // Reward amount (fixed e.g., 20 EGP)
    const REWARD_AMOUNT = 20;

    try {
      return await prisma.$transaction(async (tx) => {
        const reward = await tx.referralReward.create({
          data: {
            referrerId,
            referredId: userId,
            amount: REWARD_AMOUNT,
            status: 'PAID'
          }
        });

        await tx.userWallet.upsert({
          where: { userId: referrerId },
          update: { balance: { increment: REWARD_AMOUNT } },
          create: {
            userId: referrerId,
            balance: REWARD_AMOUNT,
          },
        });

        await tx.payment.create({
          data: {
            userId: referrerId,
            amount: REWARD_AMOUNT,
            status: 'SUCCESS',
            provider: 'REFERRAL_BONUS',
            paymentMethod: 'system',
            paymentData: `Referral reward for referred user ${userId}, source payment ${paymentAmount}`,
            referralRewardId: reward.id,
          }
        });

        return reward;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return prisma.referralReward.findUnique({
          where: { referredId: userId },
        });
      }

      throw error;
    }
  }
}
