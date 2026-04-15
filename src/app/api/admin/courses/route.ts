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
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  price: z.number().min(0).default(0),
  durationHours: z.number().min(0).default(0),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  trailerDurationMinutes: z.number().min(0).optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  language: z.string().optional().nullable(),
  coursePrerequisites: z.array(z.string()).optional().default([]),
  targetAudience: z.array(z.string()).optional().default([]),
  whatYouLearn: z.array(z.string()).optional().default([]),
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
  const normalizeStringArray = (value: unknown): string[] | undefined => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  };

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
    trailerDurationMinutes:
      payload.trailerDurationMinutes === undefined || payload.trailerDurationMinutes === null
        ? payload.trailerDurationMinutes
        : Number(payload.trailerDurationMinutes),
    seoTitle: normalizeOptionalString(payload.seoTitle),
    seoDescription: normalizeOptionalString(payload.seoDescription),
    slug: normalizeOptionalString(payload.slug),
    language: normalizeOptionalString(payload.language),
    coursePrerequisites: normalizeStringArray(payload.coursePrerequisites),
    targetAudience: normalizeStringArray(payload.targetAudience),
    whatYouLearn: normalizeStringArray(payload.whatYouLearn),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function generateUniqueSlug(baseValue: string, excludedId?: string) {
  const fallbackBase = slugify(baseValue) || `course-${Date.now()}`;
  let slug = fallbackBase;
  let counter = 1;

  while (true) {
    const existing = await prisma.subject.findFirst({
      where: {
        slug,
        ...(excludedId
          ? {
            NOT: {
              id: excludedId,
            },
          }
          : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${fallbackBase}-${counter}`;
  }
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة الدورات");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
        const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
        const cursor = searchParams.get("cursor");
        const search = searchParams.get("search") || "";
        const isActive = searchParams.get("isActive");
        const isPublished = searchParams.get("isPublished");
        const categoryId = searchParams.get("categoryId");
        const instructorId = searchParams.get("instructorId");
        const level = searchParams.get("level");

        if (Number.isNaN(limit) || limit < 1 || limit > 100) {
          return badRequestResponse("Invalid limit parameter");
        }

        if (!cursor && (Number.isNaN(offset) || offset < 0)) {
          return badRequestResponse("Invalid offset parameter");
        }

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
            level && level !== "ALL" ? { level: level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" } : {},
          ],
        };

        const [fetchedCourses, total] = await Promise.all([
          prisma.subject.findMany({
            where,
            ...(cursor
              ? {
                cursor: { id: cursor },
                skip: 1,
              }
              : {
                skip: offset,
              }),
            take: limit + 1,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

        const hasMore = fetchedCourses.length > limit;
        const courses = hasMore ? fetchedCourses.slice(0, limit) : fetchedCourses;

        return successResponse({
          courses,
          pagination: {
            limit,
            total,
            offset: cursor ? undefined : offset,
            hasMore,
            nextCursor: hasMore ? courses[courses.length - 1]?.id ?? null : null,
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

        const existingCode = validation.data.code
          ? await prisma.subject.findFirst({
            where: { code: validation.data.code },
            select: { id: true },
          })
          : null;

        if (existingCode) {
          return badRequestResponse("كود الدورة مستخدم بالفعل");
        }

        const generatedSlug = await generateUniqueSlug(
          validation.data.slug || validation.data.nameAr || validation.data.name ||
        );

        const course = await prisma.subject.create({
          data: {
            ...validation.data,
            level: validation.data.level,
            slug: generatedSlug,
            language: validation.data.language || "ar",
            lastContentUpdate: new Date(),
          },
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

        if (validation.data.code) {
          const existingCode = await prisma.subject.findFirst({
            where: {
              code: validation.data.code,
              NOT: { id },
            },
            select: { id: true },
          });

          if (existingCode) {
            return badRequestResponse("كود الدورة مستخدم بالفعل");
          }
        }

        const updateData = { ...validation.data } as Record<string, unknown>;

        if (
          validation.data.slug !== undefined ||
          validation.data.name !== undefined ||
          validation.data.nameAr !== undefined
        ) {
          const slugSource =
            validation.data.slug ||
            validation.data.nameAr ||
            validation.data.name ||
            id;

          updateData.slug = await generateUniqueSlug(slugSource, id);
        }

        updateData.lastContentUpdate = new Date();

        const course = await prisma.subject.update({
          where: { id },
          data: updateData as any,
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
