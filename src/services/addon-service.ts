import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AddonType } from '@prisma/client';

export class AddonService {
  /**
   * Purchase an addon using account balance
   */
  static async purchaseAddon(userId: string, addonId: string) {
    const addon = await prisma.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon || !addon.isActive) throw new Error('Addon not found or inactive');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    if (user.balance < addon.price) {
      throw new Error('رصيد الحساب غير كافٍ لشراء هذه الإضافة.');
    }

    // 1. Transaction to deduct balance and add credits
    return await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: addon.price } }
      });

      // Increment credits based on type
      if (addon.type === AddonType.EXAM_PACK) {
        await tx.user.update({
          where: { id: userId },
          data: { additionalExamCredits: { increment: addon.value } }
        });
      } else if (addon.type === AddonType.AI_CREDITS) {
        await tx.user.update({
          where: { id: userId },
          data: { additionalAiCredits: { increment: addon.value } }
        });
      }

      // Create Payment record
      await tx.payment.create({
        data: {
          userId,
          amount: addon.price,
          currency: 'EGP',
          status: 'SUCCESS',
          provider: 'ADDON_PURCHASE',
          paymentMethod: 'wallet',
          paymentData: `Addon purchase: ${addon.name} by user ${userId}`
        }
      });

      return { success: true, addonName: addon.nameAr || addon.name };
    });
  }

  /**
   * Get all available addons
   */
  static async getAvailableAddons() {
    return await prisma.addon.findMany({
      where: { isActive: true },
    });
  }
}
