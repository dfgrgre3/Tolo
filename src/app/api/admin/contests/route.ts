import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/contests - Get all contests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const where = search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {};

    const [contests, total] = await Promise.all([
      prisma.contest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "asc" },
      }),
      prisma.contest.count({ where }),
    ]);

    return NextResponse.json({
      contests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المسابقات" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/contests - Delete contest
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف المسابقة مطلوب" },
        { status: 400 }
      );
    }

    await prisma.contest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المسابقة" },
      { status: 500 }
    );
  }
}
