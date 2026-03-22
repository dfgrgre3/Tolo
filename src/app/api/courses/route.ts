import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withAuth } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  buildCategoriesFromCourses,
  getSubjectLessonCounts,
  getSubjectProgressMap,
  mapSubjectToCourse,
  resolveCourseLevel,
  type CourseSummary,
} from "@/lib/courses/course-service";

const SORT_OPTIONS = ["newest", "popular", "rated", "price-low", "price-high"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function normalizeFilterToken(value: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isSortOption(value: string | null): value is SortOption {
  return SORT_OPTIONS.includes(value as SortOption);
}

function applyCourseFilters(
  courses: CourseSummary[],
  options: {
    search: string;
    category: string;
    level: string;
    sort: SortOption;
  }
): CourseSummary[] {
  const { search, category, level, sort } = options;

  const filtered = courses.filter((course) => {
    const matchesCategory = !category || category === "ALL" || course.categoryId === category;
    const matchesLevel = !level || level === "ALL" || course.level === resolveCourseLevel(level);

    if (!search) {
      return matchesCategory && matchesLevel;
    }

    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      course.title.toLowerCase().includes(normalizedSearch) ||
      course.description.toLowerCase().includes(normalizedSearch) ||
      course.instructor.toLowerCase().includes(normalizedSearch) ||
      course.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));

    return matchesCategory && matchesLevel && matchesSearch;
  });

  return filtered.sort((left, right) => {
    switch (sort) {
      case "popular":
        return right.enrolledCount - left.enrolledCount;
      case "rated":
        return right.rating - left.rating;
      case "price-low":
        return left.price - right.price;
      case "price-high":
        return right.price - left.price;
      case "newest":
      default:
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }
  });
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search")?.trim() ?? "";
      const category = normalizeFilterToken(searchParams.get("category"));
      const level = normalizeFilterToken(searchParams.get("level"));
      const sort: SortOption = isSortOption(searchParams.get("sort"))
        ? (searchParams.get("sort") as SortOption)
        : "newest";

      const authenticatedUserId = req.headers.get("x-user-id")?.trim() || null;

      const subjects = await prisma.subject.findMany({
        where: {
          isActive: true,
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
        orderBy: {
          createdAt: "desc",
        },
      });

      const subjectIds = subjects.map((subject) => subject.id);
      const lessonCounts = await getSubjectLessonCounts(subjectIds);

      const enrollmentMap = new Map<string, boolean>();
      const progressMap = new Map<string, number>();

      if (authenticatedUserId && subjectIds.length > 0) {
        const enrollments = await prisma.subjectEnrollment.findMany({
          where: {
            userId: authenticatedUserId,
            subjectId: {
              in: subjectIds,
            },
          },
          select: {
            subjectId: true,
          },
        });

        const enrolledSubjectIds = enrollments.map((enrollment) => enrollment.subjectId);
        for (const subjectId of enrolledSubjectIds) {
          enrollmentMap.set(subjectId, true);
        }

        if (enrolledSubjectIds.length > 0) {
          const progressBySubject = await getSubjectProgressMap(authenticatedUserId, enrolledSubjectIds);
          for (const subjectId of enrolledSubjectIds) {
            progressMap.set(subjectId, progressBySubject[subjectId]?.percentage ?? 0);
          }
        }
      }

      const courseList = subjects.map((subject) =>
        mapSubjectToCourse(subject, {
          lessonsCount: lessonCounts[subject.id] ?? 0,
          enrolled: enrollmentMap.has(subject.id),
          progress: progressMap.get(subject.id),
        })
      );

      const filteredCourses = applyCourseFilters(courseList, {
        search,
        category,
        level,
        sort,
      });

      const categories = buildCategoriesFromCourses(courseList);

      return NextResponse.json({
        courses: filteredCourses,
        subjects: filteredCourses,
        categories,
        meta: {
          total: filteredCourses.length,
          totalAvailable: courseList.length,
          filters: {
            search,
            category: category || "ALL",
            level: level || "ALL",
            sort,
          },
        },
      });
    } catch (error) {
      logger.error("Failed to fetch courses", error);
      return NextResponse.json(
        {
          error: "ÕœÀ Œÿ√ √À‰«¡ Ã·» «·œÊ—« .",
        },
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
              error: "·«  „·ﬂ ’·«ÕÌ… ≈‰‘«¡ œÊ—… ÃœÌœ….",
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
              error: "«”„ «·œÊ—… „ÿ·Ê».",
            },
            { status: 400 }
          );
        }

        const duplicateSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { name },
              ...(code ? [{ code }] : []),
            ],
          },
          select: {
            id: true,
          },
        });

        if (duplicateSubject) {
          return NextResponse.json(
            {
              error: " ÊÃœ œÊ—… »‰›” «·«”„ √Ê «·—„“ »«·›⁄·.",
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
            error: "ÕœÀ Œÿ√ √À‰«¡ ≈‰‘«¡ «·œÊ—….",
          },
          { status: 500 }
        );
      }
    });
  });
}
