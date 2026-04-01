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
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
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
    seoTitle: normalizeOptionalString(payload.seoTitle),
    seoDescription: normalizeOptionalString(payload.seoDescription),
    slug: normalizeOptionalString(payload.slug),
  };
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط¥ط¯ط§ط±ط© ط§ظ„ط¯ظˆط±ط§طھ");
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط¥ظ†ط´ط§ط، ط¯ظˆط±ط§طھ");
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

        return successResponse({ course }, "طھظ… ط¥ظ†ط´ط§ط، ط§ظ„ط¯ظˆط±ط© ط¨ظ†ط¬ط§ط­", 201);
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨طھط­ط¯ظٹط« ط§ظ„ط¯ظˆط±ط§طھ");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("ظ…ط¹ط±ظپ ط§ظ„ط¯ظˆط±ط© ظ…ط·ظ„ظˆط¨");
        }

        const validation = courseSchema.partial().safeParse(normalizeCoursePayload(data));
        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0]?.message || "Invalid course payload");
        }

        const course = await prisma.subject.update({
          where: { id },
          data: validation.data,
        });

        return successResponse({ course }, "طھظ… طھط­ط¯ظٹط« ط§ظ„ط¯ظˆط±ط© ط¨ظ†ط¬ط§ط­");
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط­ط°ظپ ط§ظ„ط¯ظˆط±ط§طھ");
      }

      try {
        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id : "";

        if (!id) {
          return badRequestResponse("ظ…ط¹ط±ظپ ط§ظ„ط¯ظˆط±ط© ظ…ط·ظ„ظˆط¨");
        }

        const enrollmentsCount = await prisma.subjectEnrollment.count({
          where: { subjectId: id },
        });

        if (enrollmentsCount > 0) {
          return badRequestResponse(
            `ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ط¯ظˆط±ط© ظ„ظˆط¬ظˆط¯ ${enrollmentsCount} ط·ط§ظ„ط¨ ظ…ط´طھط±ظƒ ط¨ظ‡ط§. ظٹط±ط¬ظ‰ ط¥ظ„ط؛ط§ط، طھظپط¹ظٹظ„ ط§ظ„ط¯ظˆط±ط© ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط­ط°ظپظ‡ط§.`
          );
        }

        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "طھظ… ط­ط°ظپ ط§ظ„ط¯ظˆط±ط© ط¨ظ†ط¬ط§ط­");
      } catch (error: any) {
        logger.error("Error deleting admin course", error);

        if (error?.code === "P2003") {
          return badRequestResponse("طھط¹ط°ط± ط­ط°ظپ ط§ظ„ط¯ظˆط±ط© ظ„ظˆط¬ظˆط¯ ط³ط¬ظ„ط§طھ ظ…ط±طھط¨ط·ط© ط¨ظ‡ط§ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ.");
        }

        return handleApiError(error);
      }
    })
  );
}
