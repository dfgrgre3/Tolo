import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse, withAuth } from '@/lib/api-utils';

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
      const transformedPosts = posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        authorName: post.author.name,
        categoryId: post.categoryId,
        categoryName: post.category.name,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null
      }));

      return successResponse(transformedPosts);
    } catch (error: unknown) {
      logger.error("Error fetching blog posts:", error);
      return handleApiError(error);
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { title, excerpt, content, categoryId } = await req.json();

        if (!title || !excerpt || !content || !categoryId) {
          return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها");
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });

        if (!user) {
          return badRequestResponse("المستخدم غير موجود");
        }

        // Check if category exists
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
        });

        if (!category) {
          return badRequestResponse("التصنيف غير موجود");
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

        return successResponse(newPost, undefined, 201);
      } catch (error: unknown) {
        logger.error("Error creating blog post:", error);
        return handleApiError(error);
      }
    });
  });
}

