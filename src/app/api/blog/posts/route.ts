import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all blog posts
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
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
          { publishedAt: "desc" }
        ]
      });

      // Transform the data to match the frontend structure
      const transformedPosts = posts.map((post) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        authorName: post.author.name,
        categoryId: post.categoryId,
        categoryName: post.category.name,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null
      }));

      return NextResponse.json(transformedPosts);
    } catch (error: unknown) {
      logger.error("Error fetching blog posts:", error);
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ظ…ظ‚ط§ظ„ط§طھ" },
        { status: 500 }
      );
    }
  });
}

// POST create a new blog post
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { userId, title, excerpt, content, categoryId } = await req.json();

      if (!userId || !title || !excerpt || !content || !categoryId) {
        return NextResponse.json(
          { error: "ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ظٹط¬ط¨ ظ…ظ„ط¤ظ‡ط§" },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return NextResponse.json(
          { error: "ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
          { status: 404 }
        );
      }

      // Check if category exists
      const category = await prisma.blogCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return NextResponse.json(
          { error: "ط§ظ„طھطµظ†ظٹظپ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
          { status: 404 }
        );
      }

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const newPost = await prisma.blogPost.create({
        data: {
          title,
          excerpt,
          content,
          authorId: userId,
          categoryId,
          slug: `${slug}-${Date.now()}` // Ensure uniqueness
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
    } catch (error: unknown) {
      logger.error("Error creating blog post:", error);
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ظ…ظ‚ط§ظ„" },
        { status: 500 }
      );
    }
  });
}
