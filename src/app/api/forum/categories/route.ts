import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';

// GET all forum categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const categories = await prisma.category.findMany({
        where: { type: "FORUM" },
        orderBy: { name: "asc" }
      });

      return successResponse(categories);
    } catch (error) {
      logger.error("Error fetching forum categories:", error);
      return handleApiError(error);
    }
  });
}

// POST create a new forum category
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { name, description, icon } = await req.json();

      if (!name || !description) {
        return badRequestResponse("الاسم والوصف مطلوبان");
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          description,
          slug: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          icon: icon || "??",
          type: "FORUM"
        }
      });

      return successResponse(newCategory, undefined, 201);
    } catch (error) {
      logger.error("Error creating forum category:", error);
      return handleApiError(error);
    }
  });
}

