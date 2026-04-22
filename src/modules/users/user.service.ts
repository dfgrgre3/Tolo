import { userRepository } from './user.repository';
import redisService from '@/lib/redis';
import { logger } from '@/lib/logger';
import { User, Prisma } from '@prisma/client';

/**
 * --- USER SERVICE ---
 * 
 * High-level business logic for User Management.
 */
export class UserService {
  private static TTL = 86400; // 24 Hours profile cache

  /**
   * Optimized profile traversal using Redis first then modular Repository.
   */
  async getProfile(userId: string): Promise<Partial<User> | null> {
    const cacheKey = `user:${userId}:profile`;

    try {
      // 1. Redis Cache Hit
      const cached = await redisService.get<Partial<User>>(cacheKey);
      if (cached) return cached;

      // 2. Repository DB Hit
      const user = await userRepository.findProfileById(userId);

      if (!user) return null;

      // 3. Hydrate Cache
      await redisService.set(cacheKey, user, UserService.TTL);
      return user;
    } catch (error) {
      logger.error(`[UserService] Lookup failed for user ${userId}:`, error);
      // Fallback directly to Repository if Redis is failing
      return userRepository.findProfileById(userId);
    }
  }

  /**
   * Update Profile with Atomic Cache Invalidation
   */
  async updateProfile(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await userRepository.update(userId, data);
      
      // Cache Invalidation: Invalidate profile cache so next hit fetches updated data
      await redisService.del(`user:${userId}:profile`);
      
      return user;
    } catch (error) {
       logger.error(`[UserService] Failed to update profile for user ${userId}:`, error);
       throw error;
    }
  }

  /**
   * Perform Soft Delete as requested for production readiness
   */
  async softDelete(userId: string): Promise<void> {
    try {
      await userRepository.softDelete(userId);
      await redisService.del(`user:${userId}:profile`);
      logger.info(`[UserService] User ${userId} soft-deleted.`);
    } catch (error) {
        logger.error(`[UserService] Soft delete failed for user ${userId}:`, error);
        throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
