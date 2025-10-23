import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET a single blog post by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: "المقال غير موجود" },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend structure
    const transformedPost = {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      authorName: post.author.name,
      categoryId: post.categoryId,
      categoryName: post.category.name,
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt.toISOString(),
      readTime: post.readTime,
      views: post.views,
      tags: post.tags
    };

    return NextResponse.json(transformedPost);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المقال" },
      { status: 500 }
    );
  }
}

// POST to increment view count
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.blogPost.update({
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
