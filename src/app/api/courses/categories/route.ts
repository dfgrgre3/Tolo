import { CategoryType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const categories = await prisma.category.findMany({
        where: {
          type: CategoryType.COURSE,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          icon: true,
        },
      });

      return NextResponse.json(
        categories.map((category: { id: string; name: string; icon: string | null }) => ({
          id: category.id,
          name: category.name,
          icon: category.icon || "BookOpen",
        }))
      );
    } catch (error) {
      logger.error("Error fetching course categories:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب التصنيفات" },
        { status: 500 }
      );
    }
  });
}
