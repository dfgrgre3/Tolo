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
      select: { referredById: true, referralRewards: true }
    });

    if (!user?.referredById) return;

    // Check if reward already exists for this referred user
    const existingReward = await prisma.referralReward.findUnique({
      where: { referredId: userId }
    });

    if (existingReward) return;

    // Reward amount (fixed e.g., 20 EGP)
    const REWARD_AMOUNT = 20;

    // 1. Create Referral Reward record
    const reward = await prisma.referralReward.create({
      data: {
        referrerId: user.referredById,
        referredId: userId,
        amount: REWARD_AMOUNT,
        status: 'PAID'
      }
    });

    // 2. Add to Referrer's balance
    await prisma.user.update({
      where: { id: user.referredById },
      data: { balance: { increment: REWARD_AMOUNT } }
    });

    // 3. Create a Payment record for the bonus (for history)
    await prisma.payment.create({
      data: {
        userId: user.referredById,
        amount: REWARD_AMOUNT,
        status: 'SUCCESS',
        provider: 'REFERRAL_BONUS',
        paymentMethod: 'system',
        referralRewardId: reward.id,
      }
    });

    return reward;
  }
}
