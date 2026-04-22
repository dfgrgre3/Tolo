import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

import { logger } from '@/lib/logger';

// GET /api/admin/seasons - Get all seasons
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const [seasons, total] = await Promise.all([
      prisma.season.findMany({
        skip,
        take: limit,
        orderBy: { startDate: "desc" },
        include: {
          _count: {
            select: { participations: true, leaderboards: true },
          },
        },
      }),
      prisma.season.count(),
    ]);

    return NextResponse.json({
      seasons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching seasons:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المواسم" },
      { status: 500 }
    );
  }
}

// POST /api/admin/seasons - Create new season
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, startDate, endDate, rewards, isActive } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "الاسم وتواريخ البداية والنهاية مطلوبة" },
        { status: 400 }
      );
    }

    const season = await prisma.season.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rewards,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    logger.error("Error creating season:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الموسم" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/seasons - Delete season
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف الموسم مطلوب" },
        { status: 400 }
      );
    }

    await prisma.season.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting season:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الموسم" },
      { status: 500 }
    );
  }
}
