import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all users
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const decodedToken = verifyToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        lastLogin: true
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    logger.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المستخدمين" },
      { status: 500 }
    );
    }
  });
}
