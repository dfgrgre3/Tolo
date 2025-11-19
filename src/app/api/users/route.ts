import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

// GET all users
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication with timeout protection
      const verifyPromise = Promise.resolve(verifyToken(req));
      const verifyTimeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      const decodedToken = await Promise.race([verifyPromise, verifyTimeoutPromise]);
      if (!decodedToken) {
        const response = NextResponse.json(
          { error: "Unauthorized", code: 'UNAUTHORIZED' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
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
