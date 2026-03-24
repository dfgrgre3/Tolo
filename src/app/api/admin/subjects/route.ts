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
  withAuth,
} from "@/lib/api-utils";

const subjectSchema = z.object({
  name: z.string().min(1, "اسم المادة مطلوب"),
  nameAr: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("MEDIUM"),
  price: z.number().min(0).optional().default(0),
  requirements: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

type CurriculumLesson = {
  id: string;
  name: string;
  order: number;
  type: string;
  videoUrl: string | null;
  duration: number;
  isFree: boolean;
  description: string | null;
};

type CurriculumTopic = {
  id: string;
  name: string;
  order: number;
  subTopics: CurriculumLesson[];
};

type CurriculumTopicInput = {
  id: string;
  name: string;
  subTopics?: CurriculumLessonInput[];
};

type CurriculumLessonInput = {
  id: string;
  name: string;
  type?: string;
  videoUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  description?: string | null;
};

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة المواد");
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
            return badRequestResponse("المادة غير موجودة");
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
              level: subject.level,
              price: subject.price,
              requirements: subject.requirements,
              instructorName: subject.instructorName,
              instructorId: subject.instructorId,
              thumbnailUrl: subject.thumbnailUrl,
              trailerUrl: subject.trailerUrl,
            },
            curriculum: includeCurriculum
              ? (subject.topics as CurriculumTopic[]).map((topic: CurriculumTopic) => ({
                id: topic.id,
                name: topic.name,
                order: topic.order,
                subTopics: topic.subTopics.map((subTopic: CurriculumLesson) => ({
                  id: subTopic.id,
                  name: subTopic.name,
                  order: subTopic.order,
                  type: subTopic.type,
                  videoUrl: subTopic.videoUrl,
                  duration: subTopic.duration,
                  isFree: subTopic.isFree,
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

        return successResponse(subject, "تمت إضافة المادة بنجاح", 201);
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
    })
  );
}

export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتعديل المنهج");
      }

      try {
        const body = await req.json();
        const { id, curriculum } = body;

        if (!id) {
          return badRequestResponse("معرف المادة مطلوب");
        }

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("بيانات المنهج غير صالحة");
        }

        await prisma.$transaction(async (tx: any) => {
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
                  name: chapter.name,
                  order: topicOrder,
                },
              })
              : await tx.topic.update({
                where: { id: chapter.id },
                data: {
                  name: chapter.name,
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
                name: lesson.name,
                order: lessonOrder,
                type: (lesson.type || "VIDEO") as LessonType,
                videoUrl: lesson.videoUrl || null,
                duration: lesson.duration || 0,
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

        return successResponse({ success: true }, "تم حفظ المنهج بنجاح");
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
    })
  );
}
