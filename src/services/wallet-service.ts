import { prisma } from '@/lib/db';
import { Prisma, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';


export interface CreateWalletTransactionOptions {
  userId: string;
  amount: number;
  type: WalletTransactionType;
  description?: string;
  paymentId?: string;
  metadata?: any;
  status?: WalletTransactionStatus;
}

export class WalletService {
  /**
   * Get user's wallet balance
   */
  static async getBalance(userId: string) {
    const wallet = await prisma.userWallet.findUnique({
      where: { userId }
    });
    return wallet?.balance || 0;
  }

  /**
   * Get wallet transaction history
   */
  static async getHistory(userId: string, limit = 10, offset = 0) {
    return await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        payment: {
          select: {
            status: true,
            provider: true,
            paymentMethod: true
          }
        }
      }
    });
  }

  /**
   * Deposit funds into wallet
   */
  static async deposit(userId: string, amount: number, options: Omit<CreateWalletTransactionOptions, 'userId' | 'amount' | 'type'>) {
    if (amount <= 0) throw new Error('Amount must be positive');

    return await (prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update wallet balance
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: {
          userId,
          balance: amount
        }
      });

      // 2. Log transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: userId,
          amount,
          type: 'DEPOSIT',
          status: options.status || 'COMPLETED',
          description: options.description || 'Deposit to wallet',
          paymentId: options.paymentId,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null
        }
      });

      return { wallet, transaction };
    });
  }

  /**
   * Spend funds from wallet
   */
  static async spend(userId: string, amount: number, options: Omit<CreateWalletTransactionOptions, 'userId' | 'amount' | 'type'>) {
    if (amount <= 0) throw new Error('Amount must be positive');

    return await (prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Check balance
      const wallet = await tx.userWallet.findUnique({
        where: { userId }
      });

      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // 2. Update balance
      const updatedWallet = await tx.userWallet.update({
        where: { userId },
        data: { balance: { decrement: amount } }
      });

      // 3. Log transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: userId,
          amount: -amount, // Negative for spending
          type: 'PAYMENT',
          status: 'COMPLETED',
          description: options.description || 'Payment from wallet',
          paymentId: options.paymentId,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null
        }
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Refund to wallet
   */
  static async refund(userId: string, amount: number, options: Omit<CreateWalletTransactionOptions, 'userId' | 'amount' | 'type'>) {
    return await (prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: userId,
          amount,
          type: 'REFUND',
          status: 'COMPLETED',
          description: options.description || 'Refund to wallet',
          paymentId: options.paymentId,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null
        }
      });

      return { wallet, transaction };
    });
  }

  /**
   * Add bonus (referral, promo, etc.)
   */
  static async addBonus(userId: string, amount: number, type: WalletTransactionType = 'BONUS', description?: string) {
    return await (prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: userId,
          amount,
          type,
          status: 'COMPLETED',
          description: description || 'Bonus added to wallet'
        }
      });

      return { wallet, transaction };
    });
  }
}
