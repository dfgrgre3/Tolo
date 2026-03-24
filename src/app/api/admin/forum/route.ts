import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/forum - Get all forum posts
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

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.forumPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب مواضيع المنتدى" },
      { status: 500 }
    );
  }
}

// POST /api/admin/forum - Create forum post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, categoryId, isPinned, isLocked } = body;

    // Find a default admin user if no current session
    // In a real app, this should come from getServerSession()
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "لا يوجد مستخدم مدير لتعيينه كناشر" },
        { status: 400 }
      );
    }

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        categoryId,
        authorId: admin.id,
        isPinned: isPinned || false,
        isLocked: isLocked || false,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        category: {
          select: { id: true, name: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error creating forum post:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الموضوع" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/forum - Update forum post
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, categoryId, isPinned, isLocked } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف الموضوع مطلوب" },
        { status: 400 }
      );
    }

    const post = await prisma.forumPost.update({
      where: { id },
      data: {
        title,
        content,
        categoryId,
        isPinned,
        isLocked,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        category: {
          select: { id: true, name: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error updating forum post:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الموضوع" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/forum - Delete forum post
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "معرف الموضوع مطلوب" },
        { status: 400 }
      );
    }

    await prisma.forumPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الموضوع" },
      { status: 500 }
    );
  }
}
