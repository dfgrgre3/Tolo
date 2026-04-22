import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        isDeleted: true,
      }
    });
  }

  async updateLastLogin(userId: string) {
    try {
      // Update activity instead of core User to avoid hot-row lock
      return await prisma.userActivity.upsert({
        where: { userId },
        create: {
          userId,
          lastActiveAt: new Date(),
        },
        update: {
          lastActiveAt: new Date(),
        }
      });
    } catch (error) {
      logger.error(`Failed to update last login for user ${userId}:`, error);
    }
  }

  async createSession(data: {
    userId: string;
    userAgent: string;
    ip: string;
    expiresAt: Date;
  }) {
    return await prisma.session.create({
      data: {
        userId: data.userId,
        userAgent: data.userAgent,
        ip: data.ip,
        expiresAt: data.expiresAt,
        isActive: true,
      }
    });
  }
}

export const authRepository = new AuthRepository();
