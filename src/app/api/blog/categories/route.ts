import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all blog categories
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const categories = await prisma.category.findMany({
        where: { type: "BLOG" },
        orderBy: { name: "asc" }
      });

      return NextResponse.json(categories);
    } catch (error) {
      logger.error("Error fetching blog categories:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب التصنيفات" },
        { status: 500 }
      );
    }
  });
}

// POST create a new blog category
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { name, description, icon } = await req.json();

      if (!name || !description) {
        return NextResponse.json(
          { error: "الاسم والوصف مطلوبان" },
          { status: 400 }
        );
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
          description,
          icon: icon || "ًں“‚",
          type: "BLOG"
        }
      });

      return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
      logger.error("Error creating blog category:", error);
      return NextResponse.json(
        { error: "حدث خطأ في إنشاء التصنيف" },
        { status: 500 }
      );
    }
  });
}

