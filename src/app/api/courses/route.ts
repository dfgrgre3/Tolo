import { CategoryType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { ApiCache } from "@/lib/api-cache";
import { prisma } from "@/lib/db";
import { getOrSetEducationalContent, invalidateEducationalContentPattern } from "@/lib/educational-cache-service";
import { logger } from "@/lib/logger";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  getSubjectLessonCounts,
  getSubjectProgressMap,
  mapSubjectToCourse,
  resolveCourseLevel,
} from "@/lib/courses/course-service";

const SORT_OPTIONS = ["newest", "popular", "rated", "price-low", "price-high"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

interface CourseCreateRequest {
  name?: string;
  nameAr?: string;
  code?: string;
  description?: string;
  type?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authenticatedUserId = request.headers.get("x-user-id")?.trim() || null;

  // Use Global API Cache for Guest users (High Traffic / SEO Bots)
  if (!authenticatedUserId) {
    const cacheKey = ApiCache.generateKey('courses:public', searchParams);
    return ApiCache.wrap(cacheKey, () => handleGetCourses(request, null) as Promise<NextResponse<any>>, { ttl: 600 });
  }

  return handleGetCourses(request, authenticatedUserId);
}

async function handleGetCourses(req: NextRequest, authenticatedUserId: string | null): Promise<NextResponse> {
  return opsWrapper(req, async (req) => {
    try {
      const { searchParams } = new URL(req.url);

      // 1. Parse Pagination and Filters
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
      const skip = (page - 1) * limit;

      const search = searchParams.get("search")?.trim() ?? "";
      const category = searchParams.get("category");
      const level = searchParams.get("level");
      const sort = (searchParams.get("sort") || "newest") as SortOption;

      // 2. Construct Prisma Query
      const where: Prisma.SubjectWhereInput = {
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { nameAr: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (category && category !== "ALL" && category !== "") {
        where.categoryId = category;
      }

      if (level && level !== "ALL" && level !== "") {
        const prismaLevel = resolveCourseLevel(level);
        where.level = prismaLevel;
      }

      const orderBy: Prisma.SubjectOrderByWithRelationInput = {};
      switch (sort) {
        case "popular":
          orderBy.enrolledCount = "desc";
          break;
        case "rated":
          orderBy.rating = "desc";
          break;
        case "price-low":
          orderBy.price = "asc";
          break;
        case "price-high":
          orderBy.price = "desc";
          break;
        case "newest":
        default:
          orderBy.createdAt = "desc";
      }

      // 3. Execute Database Queries in Parallel (with Caching for Base Data)
      const cacheKey = `courses:list:p${page}:l${limit}:s${search}:c${category}:lv${level}:so${sort}`;

      const baseData = await getOrSetEducationalContent(cacheKey, async () => {
        const [subjects, totalCount, courseCategories] = await Promise.all([
          prisma.subject.findMany({
            where,
            include: {
              teachers: {
                select: { name: true, rating: true },
                orderBy: { rating: "desc" },
              },
              _count: { select: { enrollments: true } },
            },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.subject.count({ where }),
          prisma.category.findMany({
            where: { type: CategoryType.COURSE },
            select: { id: true, name: true, icon: true },
          }),
        ]);

        const subjectIds = subjects.map((s: { id: string }) => s.id);
        const lessonCounts = await getSubjectLessonCounts(subjectIds);

        return { subjects, totalCount, courseCategories, lessonCounts };
      }, 600); // 10 minutes cache for list

      const { subjects, totalCount, courseCategories, lessonCounts } = baseData;
      const subjectIds = subjects.map((s: { id: string }) => s.id);

      const categoryMap = new Map<string, { id: string; name: string; icon: string | null }>(courseCategories.map((c: { id: string; name: string; icon: string | null }) => [c.id, c]));

      let enrollmentMap = new Map<string, boolean>();
      let progressMap = new Map<string, number>();

      if (authenticatedUserId && subjectIds.length > 0) {
        const enrollments = await prisma.subjectEnrollment.findMany({
          where: { userId: authenticatedUserId, subjectId: { in: subjectIds } },
          select: { subjectId: true },
        });

        enrollmentMap = new Map(
          enrollments.map((enrollment: { subjectId: string }) => [enrollment.subjectId, true])
        );

        const enrolledIds = Array.from(enrollmentMap.keys());
        if (enrolledIds.length > 0) {
          const progressBySubject = await getSubjectProgressMap(authenticatedUserId, enrolledIds);
          progressMap = new Map(enrolledIds.map((id) => [id, progressBySubject[id]?.percentage ?? 0]));
        }
      }

      // 5. Map to CourseSummary
      const courseList = (subjects as any[]).map((subject) => {
        const course = mapSubjectToCourse(subject, {
          lessonsCount: lessonCounts[subject.id] ?? 0,
          enrolled: enrollmentMap.has(subject.id),
          progress: progressMap.get(subject.id),
        });
        const categoryMeta = categoryMap.get(course.categoryId);

        return {
          ...course,
          categoryName: categoryMeta?.name ?? course.categoryName,
        };
      });

      // 6. Final Category Stats (Using separate query or summary if needed)
      // For performance, we skip building categories from the entire list if not requested
      const categories = courseCategories.map((cat: { id: string; name: string; icon: string | null }) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "BookOpen",
      }));

      const response = NextResponse.json({
        courses: courseList,
        categories,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        meta: {
          filters: { search, category: category || "ALL", level: level || "ALL", sort },
        },
      });

      // 7. CDN Caching Strategy (Strategic for 1M+ users)
      if (authenticatedUserId) {
        // Private data per user - no CDN caching
        response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
      } else {
        // Public data - allow CDN to cache and serve (Cloudflare/Vercel Edge)
        // Cache for 10 minutes, with 30 minutes of stale-while-revalidate protection
        response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
        response.headers.set("Vary", "Accept-Encoding"); // Avoid caching based on auth cookies for public guests
      }

      return response;
    } catch (error: unknown) {
      logger.error("Courses API Critical Error:", error);
      return NextResponse.json(
        { error: (error as Error).message || "An unexpected error occurred while fetching courses." },
        { status: 500 }
      );
    }
  });
}


export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userRole }) => {
      try {
        if (userRole !== "ADMIN" && userRole !== "TEACHER") {
          return NextResponse.json(
            {
              error: "You do not have permission to create a new course.",
            },
            { status: 403 }
          );
        }

        const body = (await req.json()) as CourseCreateRequest;

        const name = body.name?.trim();
        const nameAr = body.nameAr?.trim() || null;
        const code = body.code?.trim().toUpperCase() || null;

        if (!name) {
          return NextResponse.json(
            {
              error: "Course name is required.",
            },
            { status: 400 }
          );
        }

        const duplicateSubject = await prisma.subject.findFirst({
          where: {
            OR: [{ name }, ...(code ? [{ code }] : [])],
          },
          select: {
            id: true,
          },
        });

        if (duplicateSubject) {
          return NextResponse.json(
            {
              error: "A course with the same name or code already exists.",
            },
            { status: 409 }
          );
        }

        const createdSubject = await prisma.subject.create({
          data: {
            name,
            nameAr,
            code,
            description: body.description?.trim() || null,
            type: body.type?.trim() || null,
            color: body.color?.trim() || null,
            icon: body.icon?.trim() || null,
            isActive: body.isActive ?? true,
          },
          include: {
            teachers: {
              select: {
                name: true,
                rating: true,
              },
              orderBy: {
                rating: "desc",
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        });

        // Invalidate Courses List Cache
        await invalidateEducationalContentPattern('courses:list:*');

        const course = mapSubjectToCourse(createdSubject as any, {
          lessonsCount: 0,
          enrolled: false,
        });

        return NextResponse.json(
          {
            course,
            subject: course,
          },
          { status: 201 }
        );
      } catch (error: unknown) {
        logger.error("Failed to create course", error);
        return NextResponse.json(
          {
            error: "An error occurred while creating the course.",
          },
          { status: 500 }
        );
      }
    });
  });
}
