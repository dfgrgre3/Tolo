import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all forum posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where = categoryId ? { categoryId } : {};

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        author: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ]
    });

    // Transform the data to match the frontend structure
    const transformedPosts = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      authorName: post.author.name,
      categoryId: post.categoryId,
      categoryName: post.category.name,
      createdAt: post.createdAt.toISOString(),
      views: post.views,
      repliesCount: post._count.replies,
      isPinned: post.isPinned
    }));

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المواضيع" },
      { status: 500 }
    );
  }
}

// POST create a new forum post
export async function POST(request: NextRequest) {
  try {
    const { userId, title, content, categoryId } = await request.json();

    if (!userId || !title || !content || !categoryId) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Check if category exists
    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: "التصنيف غير موجود" },
        { status: 404 }
      );
    }

    const newPost = await prisma.forumPost.create({
      data: {
        title,
        content,
        authorId: userId,
        categoryId
      },
      include: {
        author: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error("Error creating forum post:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء الموضوع" },
      { status: 500 }
    );
  }
}
