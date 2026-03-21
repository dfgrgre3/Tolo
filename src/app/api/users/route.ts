import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  createStandardErrorResponse,
  createSuccessResponse,
  addSecurityHeaders
} from '@/lib/api-utils';

// GET all users
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication via middleware
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return createStandardErrorResponse(
          'Unauthorized',
          'Unauthorized',
          401
        );
      }

      // Fetch users with timeout protection
      const fetchPromise = prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          lastLogin: true
        },
        orderBy: { name: "asc" }
      });

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const users = await Promise.race([fetchPromise, timeoutPromise]);

      return createSuccessResponse(users);
    } catch (error) {
      logger.error("Error fetching users:", error);
      return createStandardErrorResponse(
        error,
        "حدث خطأ في جلب المستخدمين"
      );
    }
  });
}
