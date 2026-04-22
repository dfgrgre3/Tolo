import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LessonType } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  successResponse,
  withAuth } from
"@/lib/api-utils";
import { logger } from '@/lib/logger';

const subjectSchema = z.object({
  name: z.string().min(1, "طآ§طآ³ظâ€¦ طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© ظâ€¦طآ·ظâ€‍ظث†طآ¨"),
  nameAr: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  price: z.number().min(0).optional().default(0),
  durationHours: z.number().min(0).optional().default(0),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable()
});

type CurriculumLesson = {
  id: string;
  title: string;
  order: number;
  type: string;
  videoUrl: string | null;
  durationMinutes: number;
  isFree: boolean;
  description: string | null;
};

type CurriculumTopic = {
  id: string;
  title: string;
  order: number;
  subTopics: CurriculumLesson[];
};

type CurriculumTopicInput = {
  id: string;
  title: string;
  subTopics?: CurriculumLessonInput[];
};

type CurriculumLessonInput = {
  id: string;
  title: string;
  type?: string;
  videoUrl?: string | null;
  durationMinutes?: number;
  isFree?: boolean;
  description?: string | null;
};

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAuth(req, async (authUser) => {
    if (authUser.userRole !== "ADMIN") {
      return forbiddenResponse("غيطآ± ظâ€¦طآ³ظâ€¦ظث†طآ­ ظâ€‍ظئ’ طآ¨طآ§ظâ€‍ظث†طآµظث†ظâ€‍ طآ¥ظâ€‍ظâ€° طآ¥طآ¯طآ§طآ±طآ© طآ§ظâ€‍ظâ€¦ظث†طآ§طآ¯");
    }

    try {
      const searchParams = req.nextUrl.searchParams;
      const subjectId = searchParams.get("id");
      const includeCurriculum = searchParams.get("include") === "curriculum";

      if (subjectId) {
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
          include: includeCurriculum ?
          {
            topics: {
              orderBy: { order: "asc" },
              include: {
                subTopics: {
                  orderBy: { order: "asc" }
                }
              }
            }
          } :
          undefined
        });

        if (!subject) {
          return badRequestResponse("طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© غيطآ± ظâ€¦ظث†طآ¬ظث†طآ¯طآ©");
        }

        return successResponse({
          subject: {
            id: subject.id,
            name: subject.name,
            nameAr: subject.nameAr,
            code: subject.code,
            description: subject.description,
            icon: subject.icon,
            color: subject.color,
            type: subject.type,
            isActive: subject.isActive,
            isPublished: subject.isPublished,
            level: subject.level,
            price: subject.price,
            durationHours: subject.durationHours,
            requirements: subject.requirements,
            learningObjectives: subject.learningObjectives,
            instructorName: subject.instructorName,
            instructorId: subject.instructorId,
            categoryId: subject.categoryId,
            thumbnailUrl: subject.thumbnailUrl,
            trailerUrl: subject.trailerUrl
          },
          curriculum: includeCurriculum && (subject as any).topics ?
          ((subject as any).topics as unknown as CurriculumTopic[]).map((topic) => ({
            id: topic.id,
            title: topic.title,
            order: topic.order,
            subTopics: (topic.subTopics as unknown as CurriculumLesson[]).map((subTopic) => ({
              id: subTopic.id,
              title: subTopic.title,
              order: subTopic.order,
              type: subTopic.type,
              videoUrl: subTopic.videoUrl,
              durationMinutes: (subTopic as any).durationMinutes || 0,
              isFree: subTopic.isFree,
              order_sub: subTopic.order,
              description: subTopic.description
            }))
          })) :
          undefined
        });
      }

      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const search = searchParams.get("search") || "";
      const isActive = searchParams.get("isActive");
      const skip = (page - 1) * limit;

      const where = {
        AND: [
        search ?
        {
          OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { nameAr: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } }]

        } :
        {},
        isActive !== null ? { isActive: isActive === "true" } : {}]

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
              teachers: true
            }
          }
        }
      }),
      prisma.subject.count({ where })]
      );

      return successResponse({
        subjects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAuth(req, async (authUser) => {
    if (authUser.userRole !== "ADMIN") {
      return forbiddenResponse("غيطآ± ظâ€¦طآ³ظâ€¦ظث†طآ­ ظâ€‍ظئ’ طآ¨طآ¥ظâ€ طآ´طآ§ء ظâ€¦ظث†طآ§طآ¯");
    }

    try {
      const body = await req.json();
      const validation = subjectSchema.safeParse(body);

      if (!validation.success) {
        return badRequestResponse(validation.error.errors[0].message);
      }

      const subject = await prisma.subject.create({
        data: validation.data
      });

      return successResponse(subject, "طھظâ€¦طھ طآ¥طآ¶طآ§فطآ© طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© طآ¨ظâ€ طآ¬طآ§طآ­", 201);
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAuth(req, async (authUser) => {
    if (authUser.userRole !== "ADMIN") {
      return forbiddenResponse("غيطآ± ظâ€¦طآ³ظâ€¦ظث†طآ­ ظâ€‍ظئ’ طآ¨طھطآ­طآ¯يطآ« طآ§ظâ€‍ظâ€¦ظث†طآ§طآ¯");
    }

    try {
      const body = await req.json();
      const { id, ...data } = body;

      if (!id) {
        return badRequestResponse("ظâ€¦طآ¹طآ±ف طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© ظâ€¦طآ·ظâ€‍ظث†طآ¨");
      }

      const subject = await prisma.subject.update({
        where: { id },
        data
      });

      return successResponse(subject, "طھظâ€¦ طھطآ­طآ¯يطآ« طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© طآ¨ظâ€ طآ¬طآ§طآ­");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAuth(req, async (authUser) => {
    if (authUser.userRole !== "ADMIN") {
      return forbiddenResponse("غيطآ± ظâ€¦طآ³ظâ€¦ظث†طآ­ ظâ€‍ظئ’ طآ¨طھطآ¹طآ¯يظâ€‍ طآ§ظâ€‍ظâ€¦ظâ€ ظâ€،طآ¬");
    }

    try {
      const body = await req.json();
      const { id, curriculum } = body;

      if (!id) {
        return badRequestResponse("ظâ€¦طآ¹طآ±ف طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© ظâ€¦طآ·ظâ€‍ظث†طآ¨");
      }

      if (!Array.isArray(curriculum)) {
        return badRequestResponse("طآ¨يطآ§ظâ€ طآ§طھ طآ§ظâ€‍ظâ€¦ظâ€ ظâ€،طآ¬ غيطآ± طآµطآ§ظâ€‍طآ­طآ©");
      }

      await (prisma as any).$transaction(async (tx: any) => {
        const existingTopics = await tx.topic.findMany({
          where: { subjectId: id },
          select: { id: true }
        });
        const existingTopicIds = existingTopics.map((topic: {id: string;}) => topic.id);

        const receivedTopicIds = (curriculum as CurriculumTopicInput[]).
        filter((chapter: CurriculumTopicInput) => !chapter.id.startsWith("new-")).
        map((chapter: CurriculumTopicInput) => chapter.id);

        const topicsToDelete = existingTopicIds.filter((topicId: string) => !receivedTopicIds.includes(topicId));
        if (topicsToDelete.length > 0) {
          await tx.topic.deleteMany({
            where: { id: { in: topicsToDelete } }
          });
        }

        for (const [topicOrder, chapter] of (curriculum as CurriculumTopicInput[]).entries()) {
          const topic = chapter.id.startsWith("new-") ?
          await tx.topic.create({
            data: {
              subjectId: id,
              title: chapter.title,
              order: topicOrder
            }
          }) :
          await tx.topic.update({
            where: { id: chapter.id },
            data: {
              title: chapter.title,
              order: topicOrder
            }
          });

          const existingSubTopics = await tx.subTopic.findMany({
            where: { topicId: topic.id },
            select: { id: true }
          });
          const existingSubTopicIds = existingSubTopics.map((subTopic: {id: string;}) => subTopic.id);

          const receivedSubTopicIds = (chapter.subTopics || []).
          filter((lesson: CurriculumLessonInput) => !lesson.id.startsWith("new-")).
          map((lesson: CurriculumLessonInput) => lesson.id);

          const subTopicsToDelete = existingSubTopicIds.filter(
            (subTopicId: string) => !receivedSubTopicIds.includes(subTopicId)
          );
          if (subTopicsToDelete.length > 0) {
            await tx.subTopic.deleteMany({
              where: { id: { in: subTopicsToDelete } }
            });
          }

          for (const [lessonOrder, lesson] of (chapter.subTopics || []).entries()) {
            const lessonData = {
              topicId: topic.id,
              title: lesson.title,
              order: lessonOrder,
              type: (lesson.type || "VIDEO") as LessonType,
              videoUrl: lesson.videoUrl || null,
              durationMinutes: lesson.durationMinutes || 0,
              isFree: lesson.isFree || false,
              description: lesson.description || null
            };

            if (lesson.id.startsWith("new-")) {
              await tx.subTopic.create({ data: lessonData });
            } else {
              await tx.subTopic.update({
                where: { id: lesson.id },
                data: lessonData
              });
            }
          }
        }
      });

      return successResponse({ success: true }, "طھظâ€¦ طآ­فطآ¸ طآ§ظâ€‍ظâ€¦ظâ€ ظâ€،طآ¬ طآ¨ظâ€ طآ¬طآ§طآ­");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAuth(req, async (authUser) => {
    if (authUser.userRole !== "ADMIN") {
      return forbiddenResponse("غيطآ± ظâ€¦طآ³ظâ€¦ظث†طآ­ ظâ€‍ظئ’ طآ¨طآ­طآ°ف طآ§ظâ€‍ظâ€¦ظث†طآ§طآ¯");
    }

    try {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return badRequestResponse("ظâ€¦طآ¹طآ±ف طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© ظâ€¦طآ·ظâ€‍ظث†طآ¨");
      }

      // 1. طآ§ظâ€‍طھطآ­ظâ€ڑظâ€ڑ ظâ€¦ظâ€  ظث†طآ¬ظث†طآ¯ ظâ€¦طآ´طھطآ±ظئ’يظâ€  (طآ£ظâ€،ظâ€¦ فطآ­طآµ)
      const enrollmentsCount = await prisma.subjectEnrollment.count({
        where: { subjectId: id }
      });

      if (enrollmentsCount > 0) {
        return badRequestResponse(`ظâ€‍طآ§ يظâ€¦ظئ’ظâ€  طآ­طآ°ف ظâ€،طآ°ظâ€، طآ§ظâ€‍طآ¯ظث†طآ±طآ© ظâ€‍ظث†طآ¬ظث†طآ¯ ${enrollmentsCount} طآ·طآ§ظâ€‍طآ¨ ظâ€¦طآ´طھطآ±ظئ’ طآ¨ظâ€،طآ§. طآ§ظâ€‍ظâ€ڑظث†طآ§طآ¹طآ¯ طھظâ€¦ظâ€ طآ¹ طآ­طآ°ف طآ§ظâ€‍طآ¨يطآ§ظâ€ طآ§طھ طآ§ظâ€‍ظâ€¦طآ±طھطآ¨طآ·طآ© طآ¨طآ³طآ¬ظâ€‍طآ§طھ ظâ€¦طآ§ظâ€‍يطآ© طآ£ظث† طآ·ظâ€‍طآ§طآ¨يطآ©. يطآ±طآ¬ظâ€° طآ¥ظâ€‍غطآ§ء طھفطآ¹يظâ€‍ طآ§ظâ€‍طآ¯ظث†طآ±طآ© طآ¨طآ¯ظâ€‍طآ§ظâ€¹ ظâ€¦ظâ€  طآ­طآ°فظâ€،طآ§.`);
      }

      // 2. طآ§ظâ€‍طھطآ­ظâ€ڑظâ€ڑ ظâ€¦ظâ€  ظث†طآ¬ظث†طآ¯ طآ¨يطآ§ظâ€ طآ§طھ طآ£طآ®طآ±ظâ€° ظâ€ڑطآ¯ طھظâ€¦ظâ€ طآ¹ طآ§ظâ€‍طآ­طآ°ف (ظâ€¦طآ«ظâ€‍ طآ§ظâ€‍طآ§ظâ€¦طھطآ­طآ§ظâ€ طآ§طھ طآ£ظث† طآ§ظâ€‍ظئ’طھطآ¨ طآ¥طآ°طآ§ ظâ€‍ظâ€¦ طھظئ’ظâ€  Cascade)
      // ظâ€¦ظâ€‍طآ§طآ­طآ¸طآ©: ظâ€¦طآ¹طآ¸ظâ€¦ طآ§ظâ€‍طآ¹ظâ€‍طآ§ظâ€ڑطآ§طھ طآ§ظâ€‍طآ£طآ®طآ±ظâ€° ظâ€¦طآ±طھطآ¨طآ·طآ© طآ¨ظâ‚¬ Cascade في Schema

      await prisma.subject.delete({
        where: { id }
      });

      return successResponse({ success: true }, "طھظâ€¦ طآ­طآ°ف طآ§ظâ€‍طآ¯ظث†طآ±طآ© طآ¨ظâ€ طآ¬طآ§طآ­");
    } catch (error: unknown) {
      const _errorMessage = error instanceof Error ? error.message : "طآ®طآ·طآ£ غيطآ± ظâ€¦طآ¹طآ±ظث†ف";
      const errorCode = (error as {code?: string;}).code;

      logger.error('Error deleting course:', error);

      // طآ§ظâ€‍طھظâ€ڑطآ§طآ· طآ£طآ®طآ·طآ§ء Prisma طآ§ظâ€‍ظâ€¦طآ­طآ¯طآ¯طآ©
      if (errorCode === 'P2003') {
        return badRequestResponse("فطآ´ظâ€‍ طآ§ظâ€‍طآ­طآ°ف طآ¨طآ³طآ¨طآ¨ ظث†طآ¬ظث†طآ¯ ظâ€ڑيظث†طآ¯ (Constraints) في ظâ€ڑطآ§طآ¹طآ¯طآ© طآ§ظâ€‍طآ¨يطآ§ظâ€ طآ§طھ. ظâ€،ظâ€ طآ§ظئ’ طآ³طآ¬ظâ€‍طآ§طھ طآ£طآ®طآ±ظâ€° ظâ€¦طآ±طھطآ¨طآ·طآ© طآ¨ظâ€،طآ°ظâ€، طآ§ظâ€‍ظâ€¦طآ§طآ¯طآ© طھظâ€¦ظâ€ طآ¹ طآ­طآ°فظâ€،طآ§.");
      }

      return handleApiError(error);
    }
  })
  );
}