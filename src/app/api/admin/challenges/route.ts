import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

import { logger } from '@/lib/logger';

// GET /api/admin/challenges - Get all challenges
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? { title: { contains: search, mode: "insensitive" as const } }
          : {},
        isActive !== null ? { isActive: isActive === "true" } : {},
      ],
    };

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true, nameAr: true },
          },
          _count: {
            select: { completions: true },
          },
        },
      }),
      prisma.challenge.count({ where }),
    ]);

    return NextResponse.json({
      challenges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب التحديات" },
      { status: 500 }
    );
  }
}

// POST /api/admin/challenges - Create new challenge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, category, xpReward, requirements, startDate, endDate, subjectId, levelRange, isActive, difficulty } = body;

    if (!title || !description || !type || !category || !xpReward) {
      return NextResponse.json(
        { error: "جميع الحقول الأساسية مطلوبة" },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        type,
        category,
        xpReward,
        requirements,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        subjectId,
        levelRange,
        isActive: isActive ?? true,
        difficulty: difficulty || "MEDIUM",
      },
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(challenge);
  } catch (error) {
    logger.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء التحدي" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/challenges - Delete challenge
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف التحدي مطلوب" },
        { status: 400 }
      );
    }

    await prisma.challenge.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting challenge:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف التحدي" },
      { status: 500 }
    );
  }
}
