import { prisma } from '@/lib/db';
import { User, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * --- USER REPOSITORY ---
 * 
 * Performance-focused DB operations for User data.
 * Adheres to "SELECT only what you need" principle.
 */
export class UserRepository {
  /**
   * Complex read with relations optimized for profile hydration.
   */
  async findProfileById(userId: string): Promise<Partial<User> | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId, isDeleted: false },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatar: true,
          role: true,
          status: true,
          gradeLevel: true,
          xp: {
            select: {
              totalXP: true,
              level: true
            }
          },
          activity: {
            select: {
              currentStreak: true,
              longestStreak: true
            }
          }
        }
      });
    } catch (error) {
      logger.error(`[UserRepository] DB Error in findProfileById for ${userId}:`, error);
      throw error;
    }
  }

  async update(userId: string, data: Prisma.UserUpdateInput) {
    return await prisma.user.update({
      where: { id: userId },
      data
    });
  }

  async softDelete(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'DELETED'
      }
    });
  }
}

export const userRepository = new UserRepository();
export default userRepository;
