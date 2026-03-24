import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { CategoryType } from "@prisma/client";
import { withAdmin, handleApiError, successResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET /api/admin/forum-categories - Get all forum categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAdmin(req, async () => {
      try {
        const categories = await prisma.category.findMany({
          where: {
            type: CategoryType.FORUM,
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
