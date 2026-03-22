import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/rewards - Get all rewards
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const rarity = searchParams.get("rarity");
    const isActive = searchParams.get("isActive");

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
        type ? { type } : {},
        rarity ? { rarity } : {},
        isActive !== null ? { isActive: isActive === "true" } : {},
      ],
    };

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              userRewards: true,
            },
          },
        },
      }),
      prisma.reward.count({ where }),
    ]);

    return NextResponse.json({
      rewards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المكافآت" },
      { status: 500 }
    );
  }
}

// POST /api/admin/rewards - Create new reward
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, rarity, imageUrl, metadata, isTradeable, isActive } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "الاسم والنوع مطلوبان" },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        description,
        type,
        rarity: rarity || "common",
        imageUrl,
        metadata,
        isTradeable: isTradeable ?? false,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(reward);
  } catch (error) {
    console.error("Error creating reward:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء المكافأة" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/rewards - Update reward
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف المكافأة مطلوب" },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.update({
      where: { id },
      data,
    });

    return NextResponse.json(reward);
  } catch (error) {
    console.error("Error updating reward:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المكافأة" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rewards - Delete reward
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف المكافأة مطلوب" },
        { status: 400 }
      );
    }

    await prisma.reward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reward:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المكافأة" },
      { status: 500 }
    );
  }
}
