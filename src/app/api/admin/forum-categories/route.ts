import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CategoryType } from "@prisma/client";

// GET /api/admin/forum-categories - Get all forum categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        type: CategoryType.FORUM,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching forum categories:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب أقسام المنتدى" },
      { status: 500 }
    );
  }
}
