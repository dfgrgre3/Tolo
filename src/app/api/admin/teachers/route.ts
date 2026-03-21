import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";

const teacherSchema = z.object({
  name: z.string().min(1, "اسم المعلم مطلوب"),
  subjectId: z.string().min(1, "معرف المادة مطلوب"),
  onlineUrl: z.string().optional(),
  notes: z.string().optional(),
  rating: z.number().default(0),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة المعلمين");
      }

      try {
        const teachers = await prisma.teacher.findMany({
          include: {
            subject: {
              select: {
                name: true,
                nameAr: true,
                color: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        });

        return successResponse({ teachers });
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
        return forbiddenResponse("غير مسموح لك بإضافة معلمين");
      }

      try {
        const body = await req.json();
        const validation = teacherSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const teacher = await prisma.teacher.create({
          data: validation.data,
        });

        return successResponse(teacher, "تم إضافة المعلم بنجاح", 201);
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
        return forbiddenResponse("غير مسموح لك بتحديث بيانات المعلمين");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف المعلم مطلوب");
        }

        const teacher = await prisma.teacher.update({
          where: { id },
          data,
        });

        return successResponse(teacher, "تم تحديث بيانات المعلم بنجاح");
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
        return forbiddenResponse("غير مسموح لك بحذف المعلمين");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف المعلم مطلوب");
        }

        await prisma.teacher.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف المعلم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

