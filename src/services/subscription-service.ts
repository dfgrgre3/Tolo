import { prisma } from '@/lib/db';
import { PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { CacheService, InvalidationService } from '@/lib/cache';

export type BillingCycle = 'monthly' | 'yearly';

export function getSubscriptionEndDate(cycle: BillingCycle, planInterval: string) {
  const endDate = new Date();

  if (cycle === 'yearly' || planInterval === 'YEARLY') {
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  }

  endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
}

export class SubscriptionService {
  static async checkActiveSubscription(userId: string) {
    const cacheKey = `user:${userId}:subscription`;
    
    return CacheService.getOrSet(cacheKey, async () => {
      return prisma.subscription.findFirst({
        where: {
          userId,
          OR: [
            { status: 'ACTIVE', endDate: { gt: new Date() } },
            { status: 'GRACE_PERIOD', gracePeriodEndDate: { gt: new Date() } },
          ],
        },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }, 600); // Cache for 10 minutes
  }

  static async cancelSubscription(subscriptionId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        gracePeriodEndDate: null,
      },
    }).then(async (res: any) => {
      await InvalidationService.invalidateUser(res.userId);
      return res;
    });
  }

  static async getBillingHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  static async getBillingSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        wallet: { select: { balance: true } },
        additionalAiCredits: true,
        additionalExamCredits: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            plan: true,
            payments: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { subscription: { include: { plan: true } } },
        },
      },
    });

    if (!user) return null;

    const totalSpent = user.payments
      .filter((payment: any) => payment.status === 'SUCCESS')
      .reduce((sum: number, payment: any) => sum + payment.amount, 0);

    const activeSubscription =
      user.subscriptions.find(
        (subscription: any) =>
          subscription.status === 'ACTIVE' ||
          (subscription.status === 'GRACE_PERIOD' &&
            subscription.gracePeriodEndDate &&
            subscription.gracePeriodEndDate > new Date())
      ) ?? null;

    return {
      name: user.name,
      email: user.email,
      balance: user.wallet?.balance || 0,
      additionalAiCredits: user.additionalAiCredits,
      additionalExamCredits: user.additionalExamCredits,
      activeSubscription,
      paymentHistory: user.payments,
      stats: {
        totalSpent,
        paymentCount: user.payments.length,
        successCount: user.payments.filter((p: any) => p.status === 'SUCCESS').length,
        pendingCount: user.payments.filter((p: any) => p.status === 'PENDING').length,
        failedCount: user.payments.filter((p: any) => p.status === 'FAILED').length,
      },
    };
  }

  static async calculateRemainingValue(userId: string) {
    const activeSub = await this.checkActiveSubscription(userId);
    if (!activeSub?.endDate || !activeSub.startDate) return 0;

    const now = new Date();
    const start = new Date(activeSub.startDate);
    const end = new Date(activeSub.endDate);

    if (now >= end) return 0;

    const totalDuration = end.getTime() - start.getTime();
    const remainingDuration = end.getTime() - now.getTime();

    const lastPayment = await prisma.payment.findFirst({
      where: { subscriptionId: activeSub.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    const paidAmount = lastPayment?.amount || activeSub.plan.price;
    const remainingValue = (remainingDuration / totalDuration) * paidAmount;

    return Math.floor(remainingValue * 100) / 100;
  }

  static async handleProration(userId: string, newPlanPrice: number) {
    const remainingValue = await this.calculateRemainingValue(userId);

    let adjustedPrice = newPlanPrice - remainingValue;
    let creditBalance = 0;

    if (adjustedPrice < 0) {
      creditBalance = Math.abs(adjustedPrice);
      adjustedPrice = 0;
    }

    return {
      remainingValue,
      adjustedPrice,
      creditBalance,
    };
  }

  static async createPendingSubscriptionPurchase(input: {
    userId: string;
    planId: string;
    billingCycle: BillingCycle;
    planInterval: string;
    finalAmount: number;
    paymentMethod: string;
    couponId?: string | null;
    promoDiscount?: number;
    prorationDiscount?: number;
    balanceUsed?: number;
    creditAmount?: number;
    provider?: string;
  }) {
    const {
      userId,
      planId,
      billingCycle,
      planInterval,
      finalAmount,
      paymentMethod,
      couponId,
      promoDiscount = 0,
      prorationDiscount = 0,
      balanceUsed = 0,
      creditAmount = 0,
      provider = 'PAYMOB',
    } = input;

    const startDate = new Date();
    const endDate = getSubscriptionEndDate(billingCycle, planInterval);

    return (prisma as any).$transaction(async (tx: any) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId,
          status: 'INACTIVE',
          startDate,
          endDate,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount: finalAmount,
          currency: 'EGP',
          status: 'PENDING',
          provider,
          paymentMethod,
          couponId,
          discountAmount: promoDiscount + prorationDiscount + balanceUsed,
          promoDiscount,
          prorationDiscount,
          balanceUsed,
          creditAmount,
        },
      });

      return { subscription, payment };
    });
  }

  static async activateSubscriptionPayment(
    paymentId: string,
    details?: {
      transactionId?: string | null;
      orderId?: string | null;
      paymentData?: string | null;
    }
  ) {
    return (prisma as any).$transaction(async (tx: any) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        return payment;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId: details?.transactionId ?? payment.transactionId,
          orderId: details?.orderId ?? payment.orderId,
          paymentData: details?.paymentData ?? payment.paymentData,
        },
      });

      if (payment.subscriptionId) {
        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            gracePeriodEndDate: null,
          },
        });

        await tx.subscription.updateMany({
          where: {
            userId: payment.userId,
            id: { not: payment.subscriptionId },
            status: {
              in: [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.GRACE_PERIOD,
                SubscriptionStatus.INACTIVE,
              ],
            },
          },
          data: {
            status: SubscriptionStatus.CANCELLED,
            gracePeriodEndDate: null,
          },
        });

        await InvalidationService.invalidateUser(payment.userId);
      }

      if (payment.couponId) {
        await tx.coupon.update({
          where: { id: payment.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      if ((payment.balanceUsed ?? 0) > 0) {
        await tx.userWallet.upsert({
          where: { userId: payment.userId },
          update: { balance: { decrement: payment.balanceUsed ?? 0 } },
          create: {
            userId: payment.userId,
            balance: 0,
          },
        });
      }

      if ((payment.creditAmount ?? 0) > 0) {
        await tx.userWallet.upsert({
          where: { userId: payment.userId },
          update: { balance: { increment: payment.creditAmount ?? 0 } },
          create: {
            userId: payment.userId,
            balance: payment.creditAmount ?? 0,
          },
        });
      }

      return updatedPayment;
    });
  }

  static async failSubscriptionPayment(
    paymentId: string,
    details?: {
      transactionId?: string | null;
      paymentData?: string | null;
      errorMessage?: string | null;
    }
  ) {
    return (prisma as any).$transaction(async (tx: any) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      if (payment.status === PaymentStatus.FAILED) {
        return payment;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          transactionId: details?.transactionId ?? payment.transactionId,
          paymentData: details?.paymentData ?? payment.paymentData,
          errorMessage: details?.errorMessage ?? payment.errorMessage,
        },
      });

      if (payment.subscriptionId) {
        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: SubscriptionStatus.CANCELLED },
        });
      }

      return updatedPayment;
    });
  }

  static async handleSubscriptionLifecycle() {
    const now = new Date();

    const movedToGrace = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      data: {
        status: 'GRACE_PERIOD',
        gracePeriodEndDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
    });

    const fullyExpired = await prisma.subscription.updateMany({
      where: {
        status: 'GRACE_PERIOD',
        gracePeriodEndDate: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    return {
      movedToGrace: movedToGrace.count,
      fullyExpired: fullyExpired.count,
    };
  }
}
