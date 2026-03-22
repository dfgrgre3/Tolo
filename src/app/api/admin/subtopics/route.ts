import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils';
import { z } from "zod";

const subTopicSchema = z.object({
  topicId: z.string().min(1, "معرف الموضوع مطلوب"),
  name: z.string().min(1, "اسم الدرس مطلوب"),
  description: z.string().optional(),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  order: z.number().default(0),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة الدروس");
      }

      try {
        const { searchParams } = new URL(request.url);
        const topicId = searchParams.get("topicId");

        const where = topicId ? { topicId } : {};

        const subTopics = await prisma.subTopic.findMany({
          where,
          orderBy: { order: "asc" },
          include: {
            topic: {
              include: { subject: { select: { nameAr: true, name: true } } }
            }
          }
        });

        return successResponse(subTopics);
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
        return forbiddenResponse("غير مسموح لك بإنشاء دروس");
      }

      try {
        const body = await req.json();
        const validation = subTopicSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const subTopic = await prisma.subTopic.create({
          data: validation.data,
        });

        return successResponse(subTopic, "تم إضافة الدرس بنجاح", 201);
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
        return forbiddenResponse("غير مسموح لك بتحديث الدروس");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف الدرس مطلوب");
        }

        const subTopic = await prisma.subTopic.update({
          where: { id },
          data,
        });

        return successResponse(subTopic, "تم تحديث الدرس بنجاح");
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
        return forbiddenResponse("غير مسموح لك بحذف الدروس");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف الدرس مطلوب");
        }

        await prisma.subTopic.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الدرس بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
