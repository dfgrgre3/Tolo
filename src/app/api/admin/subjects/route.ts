import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LessonType, Prisma } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from '@/lib/logger';

const subjectSchema = z.object({
  name: z.string().min(1, "ط§ط³ظ… ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨"),
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
  trailerUrl: z.string().optional().nullable(),
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط¥ط¯ط§ط±ط© ط§ظ„ظ…ظˆط§ط¯");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const subjectId = searchParams.get("id");
        const includeCurriculum = searchParams.get("include") === "curriculum";

        if (subjectId) {
          const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: includeCurriculum
              ? {
                topics: {
                  orderBy: { order: "asc" },
                  include: {
                    subTopics: {
                      orderBy: { order: "asc" },
                    },
                  },
                },
              }
              : undefined,
          });

          if (!subject) {
            return badRequestResponse("ط§ظ„ظ…ط§ط¯ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©");
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
              trailerUrl: subject.trailerUrl,
            },
            curriculum: (includeCurriculum && (subject as any).topics)
              ? ((subject as any).topics as unknown as CurriculumTopic[]).map((topic) => ({
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
                  description: subTopic.description,
                })),
              }))
              : undefined,
          });
        }

        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
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
    })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط¥ظ†ط´ط§ط، ظ…ظˆط§ط¯");
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

        return successResponse(subject, "طھظ…طھ ط¥ط¶ط§ظپط© ط§ظ„ظ…ط§ط¯ط© ط¨ظ†ط¬ط§ط­", 201);
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨طھط­ط¯ظٹط« ط§ظ„ظ…ظˆط§ط¯");
      }

      try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
          return badRequestResponse("ظ…ط¹ط±ظپ ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨");
        }

        const subject = await prisma.subject.update({
          where: { id },
          data,
        });

        return successResponse(subject, "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ط§ط¯ط© ط¨ظ†ط¬ط§ط­");
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ†ظ‡ط¬");
      }

      try {
        const body = await req.json();
        const { id, curriculum } = body;

        if (!id) {
          return badRequestResponse("ظ…ط¹ط±ظپ ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨");
        }

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†ظ‡ط¬ ط؛ظٹط± طµط§ظ„ط­ط©");
        }

        await (prisma as any).$transaction(async (tx: any) => {
          const existingTopics = await tx.topic.findMany({
            where: { subjectId: id },
            select: { id: true },
          });
          const existingTopicIds = existingTopics.map((topic: { id: string }) => topic.id);

          const receivedTopicIds = (curriculum as CurriculumTopicInput[])
            .filter((chapter: CurriculumTopicInput) => !chapter.id.startsWith("new-"))
            .map((chapter: CurriculumTopicInput) => chapter.id);

          const topicsToDelete = existingTopicIds.filter((topicId: string) => !receivedTopicIds.includes(topicId));
          if (topicsToDelete.length > 0) {
            await tx.topic.deleteMany({
              where: { id: { in: topicsToDelete } },
            });
          }

          for (const [topicOrder, chapter] of (curriculum as CurriculumTopicInput[]).entries()) {
            const topic = chapter.id.startsWith("new-")
              ? await tx.topic.create({
                data: {
                  subjectId: id,
                  title: chapter.title,
                  order: topicOrder,
                },
              })
              : await tx.topic.update({
                where: { id: chapter.id },
                data: {
                  title: chapter.title,
                  order: topicOrder,
                },
              });

            const existingSubTopics = await tx.subTopic.findMany({
              where: { topicId: topic.id },
              select: { id: true },
            });
            const existingSubTopicIds = existingSubTopics.map((subTopic: { id: string }) => subTopic.id);

            const receivedSubTopicIds = (chapter.subTopics || [])
              .filter((lesson: CurriculumLessonInput) => !lesson.id.startsWith("new-"))
              .map((lesson: CurriculumLessonInput) => lesson.id);

            const subTopicsToDelete = existingSubTopicIds.filter(
              (subTopicId: string) => !receivedSubTopicIds.includes(subTopicId)
            );
            if (subTopicsToDelete.length > 0) {
              await tx.subTopic.deleteMany({
                where: { id: { in: subTopicsToDelete } },
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
                description: lesson.description || null,
              };

              if (lesson.id.startsWith("new-")) {
                await tx.subTopic.create({ data: lessonData });
              } else {
                await tx.subTopic.update({
                  where: { id: lesson.id },
                  data: lessonData,
                });
              }
            }
          }
        });

        return successResponse({ success: true }, "طھظ… ط­ظپط¸ ط§ظ„ظ…ظ†ظ‡ط¬ ط¨ظ†ط¬ط§ط­");
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط­ط°ظپ ط§ظ„ظ…ظˆط§ط¯");
      }

      try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
          return badRequestResponse("ظ…ط¹ط±ظپ ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨");
        }

        // 1. ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…ط´طھط±ظƒظٹظ† (ط£ظ‡ظ… ظپط­طµ)
        const enrollmentsCount = await prisma.subjectEnrollment.count({
          where: { subjectId: id }
        });

        if (enrollmentsCount > 0) {
          return badRequestResponse(`ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ط¯ظˆط±ط© ظ„ظˆط¬ظˆط¯ ${enrollmentsCount} ط·ط§ظ„ط¨ ظ…ط´طھط±ظƒ ط¨ظ‡ط§. ط§ظ„ظ‚ظˆط§ط¹ط¯ طھظ…ظ†ط¹ ط­ط°ظپ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ط³ط¬ظ„ط§طھ ظ…ط§ظ„ظٹط© ط£ظˆ ط·ظ„ط§ط¨ظٹط©. ظٹط±ط¬ظ‰ ط¥ظ„ط؛ط§ط، طھظپط¹ظٹظ„ ط§ظ„ط¯ظˆط±ط© ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط­ط°ظپظ‡ط§.`);
        }

        // 2. ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ط¨ظٹط§ظ†ط§طھ ط£ط®ط±ظ‰ ظ‚ط¯ طھظ…ظ†ط¹ ط§ظ„ط­ط°ظپ (ظ…ط«ظ„ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط£ظˆ ط§ظ„ظƒطھط¨ ط¥ط°ط§ ظ„ظ… طھظƒظ† Cascade)
        // ظ…ظ„ط§ط­ط¸ط©: ظ…ط¹ط¸ظ… ط§ظ„ط¹ظ„ط§ظ‚ط§طھ ط§ظ„ط£ط®ط±ظ‰ ظ…ط±طھط¨ط·ط© ط¨ظ€ Cascade ظپظٹ Schema
        
        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "طھظ… ط­ط°ظپ ط§ظ„ط¯ظˆط±ط© ط¨ظ†ط¬ط§ط­");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "ط®ط·ط£ ط؛ظٹط± ظ…ط¹ط±ظˆظپ";
        const errorCode = (error as { code?: string }).code;
        
        logger.error('Error deleting course:', error);
        
        // ط§ظ„طھظ‚ط§ط· ط£ط®ط·ط§ط، Prisma ط§ظ„ظ…ط­ط¯ط¯ط©
        if (errorCode === 'P2003') {
          return badRequestResponse("ظپط´ظ„ ط§ظ„ط­ط°ظپ ط¨ط³ط¨ط¨ ظˆط¬ظˆط¯ ظ‚ظٹظˆط¯ (Constraints) ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ظ‡ظ†ط§ظƒ ط³ط¬ظ„ط§طھ ط£ط®ط±ظ‰ ظ…ط±طھط¨ط·ط© ط¨ظ‡ط°ظ‡ ط§ظ„ظ…ط§ط¯ط© طھظ…ظ†ط¹ ط­ط°ظپظ‡ط§.");
        }
        
        return handleApiError(error);
      }
    })
  );
}


