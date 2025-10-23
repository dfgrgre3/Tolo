import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where = categoryId ? { categoryId } : {};

    const posts = await prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        }
      },
      orderBy: [
        { publishedAt: "desc" },
        { views: "desc" }
      ]
    });

    // Transform the data to match the frontend structure
    const transformedPosts = posts.map(post => ({
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
    }));

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المقالات" },
      { status: 500 }
    );
  }
}

// POST create a new blog post
export async function POST(request: NextRequest) {
  try {
    const { userId, title, excerpt, content, categoryId, coverImageUrl, tags } = await request.json();

    if (!userId || !title || !excerpt || !content || !categoryId) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
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
    const category = await prisma.blogCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: "التصنيف غير موجود" },
        { status: 404 }
      );
    }

    // Calculate read time (rough estimate: 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    const newPost = await prisma.blogPost.create({
      data: {
        title,
        excerpt,
        content,
        authorId: userId,
        categoryId,
        coverImageUrl,
        tags: tags || [],
        readTime
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
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء المقال" },
      { status: 500 }
    );
  }
}
