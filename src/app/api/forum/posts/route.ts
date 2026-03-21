import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse, withAuth } from '@/lib/api-utils';

// GET all forum posts
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
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
      const transformedPosts = posts.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        authorName: post.author.name,
        categoryId: post.categoryId,
        categoryName: post.category.name,
        createdAt: post.createdAt.toISOString(),
        repliesCount: post._count.replies,
        isPinned: post.isPinned
      }));

      return successResponse(transformedPosts);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}

// POST create a new forum post
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { title, content, categoryId } = await req.json();

        if (!title || !content || !categoryId) {
          return badRequestResponse("جميع الحقول مطلوبة");
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });

        if (!user) {
          return badRequestResponse("المستخدم غير موجود", "USER_NOT_FOUND");
        }

        // Check if category exists
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
        });

        if (!category) {
          return badRequestResponse("التصنيف غير موجود", "CATEGORY_NOT_FOUND");
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

        return successResponse(newPost, undefined, 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
