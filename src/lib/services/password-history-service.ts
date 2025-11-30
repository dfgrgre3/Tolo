import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

export class PasswordHistoryService {
  private static instance: PasswordHistoryService;
  private readonly HISTORY_LIMIT = 5; // Keep last 5 passwords

  private constructor() {}

  public static getInstance(): PasswordHistoryService {
    if (!PasswordHistoryService.instance) {
      PasswordHistoryService.instance = new PasswordHistoryService();
    }
    return PasswordHistoryService.instance;
  }

  /**
   * Check if a password has been used before by the user
   */
  async checkPasswordInHistory(userId: string, password: string): Promise<{ exists: boolean; message?: string }> {
    try {
      const history = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: this.HISTORY_LIMIT,
      });

      for (const record of history) {
        const isMatch = await AuthService.comparePasswords(password, record.passwordHash);
        if (isMatch) {
          return {
            exists: true,
            message: 'لا يمكن استخدام كلمة مرور تم استخدامها مؤخراً. يرجى اختيار كلمة مرور جديدة.',
          };
        }
      }

      return { exists: false };
    } catch (error) {
      logger.error('Error checking password history:', error);
      // Fail safe: allow password change if history check fails
      return { exists: false };
    }
  }

  /**
   * Save current password to history
   */
  async savePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      // Create new history record
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash,
        },
      });

      // Clean up old records (keep only last N)
      const count = await prisma.passwordHistory.count({
        where: { userId },
      });

      if (count > this.HISTORY_LIMIT) {
        const oldestRecords = await prisma.passwordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: count - this.HISTORY_LIMIT,
          select: { id: true },
        });

        if (oldestRecords.length > 0) {
          await prisma.passwordHistory.deleteMany({
            where: {
              id: {
                in: oldestRecords.map(r => r.id),
              },
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error saving password history:', error);
      // Non-blocking error
    }
  }
}

export const passwordHistoryService = PasswordHistoryService.getInstance();
