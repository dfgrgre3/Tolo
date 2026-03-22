import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils';
import { z } from "zod";

const topicSchema = z.object({
  subjectId: z.string().min(1, "معرف المادة مطلوب"),
  name: z.string().min(1, "اسم الموضوع مطلوب"),
  description: z.string().optional(),
  order: z.number().default(0),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة المواضيع");
      }

      try {
        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");

        const where = subjectId ? { subjectId } : {};

        const topics = await prisma.topic.findMany({
          where,
          orderBy: { order: "asc" },
          include: {
            subject: {
              select: { nameAr: true, name: true }
            },
            _count: {
              select: { subTopics: true }
            }
          }
        });

        return successResponse(topics);
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
        return forbiddenResponse("غير مسموح لك بإنشاء مواضيع");
      }

      try {
        const body = await req.json();
        const validation = topicSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const topic = await prisma.topic.create({
          data: validation.data,
        });

        return successResponse(topic, "تم إضافة الموضوع بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتحديث المواضيع");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف الموضوع مطلوب");
        }

        const topic = await prisma.topic.update({
          where: { id },
          data,
        });

        return successResponse(topic, "تم تحديث الموضوع بنجاح");
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
        return forbiddenResponse("غير مسموح لك بحذف المواضيع");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف الموضوع مطلوب");
        }

        await prisma.topic.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الموضوع بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
