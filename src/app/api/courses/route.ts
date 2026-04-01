import { CategoryType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withAuth } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  getSubjectLessonCounts,
  getSubjectProgressMap,
  mapSubjectToCourse,
  resolveCourseLevel,
} from "@/lib/courses/course-service";
import { getOrSetEducationalContent, invalidateEducationalContentPattern } from "@/lib/educational-cache-service";

const SORT_OPTIONS = ["newest", "popular", "rated", "price-low", "price-high"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
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

      const authenticatedUserId = req.headers.get("x-user-id")?.trim() || null;

      // 2. Construct Prisma Query
      const where: any = {
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

      const orderBy: any = {};
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

        const subjectIds = subjects.map((s) => s.id);
        const lessonCounts = await getSubjectLessonCounts(subjectIds);

        return { subjects, totalCount, courseCategories, lessonCounts };
      }, 600); // 10 minutes cache for list

      const { subjects, totalCount, courseCategories, lessonCounts } = baseData;
      const subjectIds = subjects.map((s) => s.id);
      
      const categoryMap = new Map(courseCategories.map(c => [c.id, c]));

      let enrollmentMap = new Map<string, boolean>();
      let progressMap = new Map<string, number>();

      if (authenticatedUserId && subjectIds.length > 0) {
        const enrollments = await prisma.subjectEnrollment.findMany({
          where: { userId: authenticatedUserId, subjectId: { in: subjectIds } },
          select: { subjectId: true },
        });
        
        enrollmentMap = new Map(enrollments.map(e => [e.subjectId, true]));
        
        const enrolledIds = Array.from(enrollmentMap.keys());
        if (enrolledIds.length > 0) {
          const progressBySubject = await getSubjectProgressMap(authenticatedUserId, enrolledIds);
          progressMap = new Map(enrolledIds.map(id => [id, progressBySubject[id]?.percentage ?? 0]));
        }
      }

      // 5. Map to CourseSummary
      const courseList = subjects.map((subject) => {
        const course = mapSubjectToCourse(subject as any, {
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
      const categories = courseCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "BookOpen",
      }));

      return NextResponse.json({
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
    } catch (error) {
      logger.error("Courses API Critical Error:", error);
      return NextResponse.json(
        { error: "An unexpected error occurred while fetching courses." },
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

        const body = (await req.json()) as {
          name?: string;
          nameAr?: string;
          code?: string;
          description?: string;
          type?: string;
          color?: string;
          icon?: string;
          isActive?: boolean;
        };

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

        const course = mapSubjectToCourse(createdSubject, {
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
      } catch (error) {
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
