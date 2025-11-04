import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET a single forum post by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.forumPost.findUnique({
      where: { id },
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
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend structure
    const transformedPost = {
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
    };

    return NextResponse.json(transformedPost);
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الموضوع" },
      { status: 500 }
    );
  }
}

// POST to increment view count
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.forumPost.update({
      where: { id },
      data: {
        views: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    return NextResponse.json(
      { error: "حدث خطأ في تحديث عدد المشاهدات" },
      { status: 500 }
    );
  }
}
