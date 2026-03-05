
import { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  addSecurityHeaders,
  withAuth,
  successResponse,
} from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        // Get unread count with timeout protection
        const countPromise = prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        });

        const dbTimeoutPromise = new Promise<never>((resolve, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 5000); // 5 second timeout
        });

        const count = await Promise.race([countPromise, dbTimeoutPromise]) as number;

        const response = successResponse({ count });
        return addSecurityHeaders(response);
      } catch (error) {
        logger.error('Error fetching unread count:', error);
        // Return 0 count on error instead of throwing
        const response = successResponse({ count: 0 });
        return addSecurityHeaders(response);
      }
    });
  });
}
