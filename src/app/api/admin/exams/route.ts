import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";

const examSchema = z.object({
  title: z.string().min(1, "عنوان الامتحان مطلوب"),
  subjectId: z.string().min(1, "معرف المادة مطلوب"),
  year: z.number().default(new Date().getFullYear()),
  url: z.string().url("رابط الامتحان غير صالح"),
  type: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة الامتحانات");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const subjectId = searchParams.get("subjectId");

        const skip = (page - 1) * limit;

        const where = {
          AND: [
            search
              ? { title: { contains: search, mode: "insensitive" as const } }
              : {},
            subjectId ? { subjectId } : {},
          ],
        };

        const [exams, total] = await Promise.all([
          prisma.exam.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              subject: {
                select: { id: true, name: true, nameAr: true },
              },
              _count: {
                select: { results: true },
              },
            },
          }),
          prisma.exam.count({ where }),
        ]);

        return successResponse({
          exams,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
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
        return forbiddenResponse("غير مسموح لك بإنشاء امتحانات");
      }

      try {
        const body = await req.json();
        const validation = examSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const exam = await prisma.exam.create({
          data: validation.data,
          include: {
            subject: {
              select: { id: true, name: true },
            },
          },
        });

        return successResponse(exam, "تم إضافة الامتحان بنجاح", 201);
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
        return forbiddenResponse("غير مسموح لك بتحديث الامتحانات");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف الامتحان مطلوب");
        }

        const exam = await prisma.exam.update({
          where: { id },
          data,
          include: {
            subject: {
              select: { id: true, name: true },
            },
          },
        });

        return successResponse(exam, "تم تحديث الامتحان بنجاح");
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
        return forbiddenResponse("غير مسموح لك بحذف الامتحانات");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف الامتحان مطلوب");
        }

        await prisma.exam.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الامتحان بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

