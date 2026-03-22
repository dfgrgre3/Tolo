import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";

const subjectSchema = z.object({
  name: z.string().min(1, "اسم المادة مطلوب"),
  nameAr: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة المواد");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const isActive = searchParams.get("isActive");

        const skip = (page - 1) * limit;

        const where = {
          AND: [
            search
              ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { nameAr: { contains: search, mode: "insensitive" as const } },
                  { code: { contains: search, mode: "insensitive" as const } },
                ],
              }
              : {},
            isActive !== null ? { isActive: isActive === "true" } : {},
          ],
        };

        const [subjects, total] = await Promise.all([
          prisma.subject.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              _count: {
                select: {
                  books: true,
                  exams: true,
                  resources: true,
                  topics: true,
                  enrollments: true,
                  teachers: true,
                },
              },
            },
          }),
          prisma.subject.count({ where }),
        ]);

        return successResponse({
          subjects,
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
        return forbiddenResponse("غير مسموح لك بإنشاء مواد");
      }

      try {
        const body = await req.json();
        const validation = subjectSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const subject = await prisma.subject.create({
          data: validation.data,
        });

        return successResponse(subject, "تم إضافة المادة بنجاح", 201);
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
        return forbiddenResponse("غير مسموح لك بتحديث المواد");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف المادة مطلوب");
        }

        const subject = await prisma.subject.update({
          where: { id },
          data,
        });

        return successResponse(subject, "تم تحديث المادة بنجاح");
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
        return forbiddenResponse("غير مسموح لك بحذف المواد");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("معرف المادة مطلوب");
        }

        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف المادة بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

