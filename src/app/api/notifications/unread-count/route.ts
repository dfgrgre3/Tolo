import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  addSecurityHeaders,
  withAuth,
  successResponse,
} from '@/lib/api-utils';
import redisService from '@/lib/redis';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const cacheKey = `user:${userId}:notifications:unread_count`;
        
        const count = await redisService.getOrSet(cacheKey, async () => {
          const countPromise = prisma.notification.count({
            where: {
              userId,
              isRead: false,
              isDeleted: false,
            },
          });

          const dbTimeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(() => reject(new Error('Database query timeout')), 5000); 
          });

          return await Promise.race([countPromise, dbTimeoutPromise]) as number;
        }, 300);

        return addSecurityHeaders(successResponse({ count }));
      } catch (error) {
        logger.error('Error fetching unread count:', error);
        return addSecurityHeaders(successResponse({ count: 0 }));
      }
    });
  });
}
