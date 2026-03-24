import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  nameAr: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("MEDIUM"),
  price: z.number().min(0).default(0),
  durationHours: z.number().min(0).default(0),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeCoursePayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
    nameAr: normalizeOptionalString(payload.nameAr),
    code: normalizeOptionalString(payload.code),
    description: normalizeOptionalString(payload.description),
    icon: normalizeOptionalString(payload.icon),
    color: normalizeOptionalString(payload.color),
    type: normalizeOptionalString(payload.type),
    requirements: normalizeOptionalString(payload.requirements),
    learningObjectives: normalizeOptionalString(payload.learningObjectives),
    instructorName: normalizeOptionalString(payload.instructorName),
    instructorId: normalizeOptionalString(payload.instructorId),
    categoryId: normalizeOptionalString(payload.categoryId),
    thumbnailUrl: normalizeOptionalString(payload.thumbnailUrl),
    trailerUrl: normalizeOptionalString(payload.trailerUrl),
  };
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة الدورات");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const page = Number.parseInt(searchParams.get("page") || "1", 10);
        const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        const isActive = searchParams.get("isActive");
        const isPublished = searchParams.get("isPublished");
        const categoryId = searchParams.get("categoryId");
        const instructorId = searchParams.get("instructorId");
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
            isPublished !== null ? { isPublished: isPublished === "true" } : {},
            categoryId ? { categoryId } : {},
            instructorId ? { instructorId } : {},
          ],
        };

        const [courses, total] = await Promise.all([
          prisma.subject.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              _count: {
                select: {
                  topics: true,
                  enrollments: true,
                  reviews: true,
                  teachers: true,
                },
              },
            },
          }),
          prisma.subject.count({ where }),
        ]);

        return successResponse({
          courses,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        logger.error("Error fetching admin courses", error);
        return handleApiError(error);
      }
    })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بإنشاء دورات");
      }

      try {
        const body = await req.json();
        const validation = courseSchema.safeParse(normalizeCoursePayload(body));

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0]?.message || "Invalid course payload");
        }

        const course = await prisma.subject.create({
          data: validation.data,
        });

        return successResponse({ course }, "تم إنشاء الدورة بنجاح", 201);
      } catch (error) {
        logger.error("Error creating admin course", error);
        return handleApiError(error);
      }
    })
  );
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بتحديث الدورات");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("معرف الدورة مطلوب");
        }

        const validation = courseSchema.partial().safeParse(normalizeCoursePayload(data));
        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0]?.message || "Invalid course payload");
        }

        const course = await prisma.subject.update({
          where: { id },
          data: validation.data,
        });

        return successResponse({ course }, "تم تحديث الدورة بنجاح");
      } catch (error) {
        logger.error("Error updating admin course", error);
        return handleApiError(error);
      }
    })
  );
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بحذف الدورات");
      }

      try {
        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id : "";

        if (!id) {
          return badRequestResponse("معرف الدورة مطلوب");
        }

        const enrollmentsCount = await prisma.subjectEnrollment.count({
          where: { subjectId: id },
        });

        if (enrollmentsCount > 0) {
          return badRequestResponse(
            `لا يمكن حذف هذه الدورة لوجود ${enrollmentsCount} طالب مشترك بها. يرجى إلغاء تفعيل الدورة بدلاً من حذفها.`
          );
        }

        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الدورة بنجاح");
      } catch (error: any) {
        logger.error("Error deleting admin course", error);

        if (error?.code === "P2003") {
          return badRequestResponse("تعذر حذف الدورة لوجود سجلات مرتبطة بها في قاعدة البيانات.");
        }

        return handleApiError(error);
      }
    })
  );
}
