import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CategoryType } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, forbiddenResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول");
      }

      try {
        const categories = await prisma.category.findMany({
          where: {
            type: CategoryType.COURSE,
          },
          orderBy: {
            name: "asc",
          },
        });

        return successResponse({ categories });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
