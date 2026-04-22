import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";

const blogPostSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  content: z.string().min(1, "المحتوى مطلوب"),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  slug: z.string().min(1, "الرابط مطلوب"),
  excerpt: z.string().optional(),
  image: z.string().optional(),
  published: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى لوحة التحكم");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";

        const skip = (page - 1) * limit;

        const where = search ?
        { title: { contains: search, mode: "insensitive" as const } } :
        {};

        const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true }
            },
            category: {
              select: { id: true, name: true }
            }
          }
        }),
        prisma.blogPost.count({ where })]
        );

        return successResponse({
          posts,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بإنشاء مقالات");
      }

      try {
        const body = await req.json();
        const validation = blogPostSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const data = validation.data;

        const post = await prisma.blogPost.create({
          data: {
            ...data,
            authorId: authUser.userId
          }
        });

        return successResponse(post, "تم إنشاء المقال بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// PATCH /api/admin/blog - Update blog post
export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتحديث مقالات");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف المقال مطلوب");
        }

        const post = await prisma.blogPost.update({
          where: { id },
          data
        });

        return successResponse(post, "تم تحديث المقال بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بحذف مقالات");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف المقال مطلوب");
        }

        await prisma.blogPost.delete({
          where: { id }
        });

        return successResponse({ success: true }, "تم حذف المقال بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}