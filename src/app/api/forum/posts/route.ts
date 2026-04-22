import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
// import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse, withAuth } from '@/lib/api-utils';

// GET all forum posts
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const categoryId = searchParams.get("categoryId");

      const where = (categoryId && categoryId !== "all") ? { categoryId } : {};

      const posts = await prisma.forumPost.findMany({
        where,
        include: {
          author: {
            select: { 
              name: true,
              username: true
            }
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

      // Transform the data to match the frontend structure with safety fallbacks
      const transformedPosts = posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        authorName: (post.author.name || post.author.username || "Anonymous").toString(),
        categoryId: post.categoryId,
        categoryName: post.category.name,
        createdAt: post.createdAt.toISOString(),
        repliesCount: post._count.replies,
        isPinned: post.isPinned,
        views: post.views || 0
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
          return badRequestResponse("المستخدم غير موجود", "USER_NOT_FOUND" as any);
        }

        // Check if category exists
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
        });

        if (!category) {
          return badRequestResponse("التصنيف غير موجود", "CATEGORY_NOT_FOUND" as any);
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

        const mappedPost = {
          id: newPost.id,
          title: newPost.title,
          content: newPost.content,
          authorName: newPost.author.name || "Anonymous",
          categoryId: newPost.categoryId,
          categoryName: newPost.category.name,
          createdAt: newPost.createdAt.toISOString(),
          repliesCount: 0,
          isPinned: newPost.isPinned,
          views: newPost.views || 0
        };

        return successResponse(mappedPost, "تم نشر المخطوطة بنجاح", 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
