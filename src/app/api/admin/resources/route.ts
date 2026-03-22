import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/resources - Get all resources
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");
    const free = searchParams.get("free");

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
                { source: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
        subjectId ? { subjectId } : {},
        type ? { type } : {},
        free !== null ? { free: free === "true" } : {},
      ],
    };

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true, nameAr: true, color: true },
          },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    return NextResponse.json({
      resources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الموارد" },
      { status: 500 }
    );
  }
}

// POST /api/admin/resources - Create new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, url, type, source, free, subjectId } = body;

    if (!title || !url || !subjectId) {
      return NextResponse.json(
        { error: "العنوان والرابط والمادة مطلوبة" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        url,
        type: type || "link",
        source,
        free: free ?? true,
        subjectId,
      },
      include: {
        subject: {
          select: { id: true, name: true, nameAr: true, color: true },
        },
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء المورد" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/resources - Update resource
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, ...data } = body;

    if (ids && Array.isArray(ids)) {
      // Bulk update
      const result = await prisma.resource.updateMany({
        where: { id: { in: ids } },
        data,
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (!id) {
      return NextResponse.json(
        { error: "معرف المورد مطلوب" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.update({
      where: { id },
      data,
      include: {
        subject: {
          select: { id: true, name: true, nameAr: true, color: true },
        },
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المورد" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/resources - Delete resource
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids } = body;

    if (ids && Array.isArray(ids)) {
      // Bulk delete
      await prisma.resource.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "معرف المورد مطلوب" },
        { status: 400 }
      );
    }

    await prisma.resource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المورد" },
      { status: 500 }
    );
  }
}
