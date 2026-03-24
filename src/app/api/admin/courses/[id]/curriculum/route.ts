import { NextRequest } from "next/server";
import { LessonType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  successResponse,
  withAuth,
} from "@/lib/api-utils";

type CurriculumLessonInput = {
  id: string;
  name: string;
  type?: string;
  videoUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  description?: string | null;
};

type CurriculumTopicInput = {
  id: string;
  name: string;
  subTopics?: CurriculumLessonInput[];
};

type CurriculumSubject = Prisma.SubjectGetPayload<{
  include: {
    topics: {
      include: {
        subTopics: true;
      };
    };
  };
}>;

type CurriculumTopic = CurriculumSubject["topics"][number];
type CurriculumSubTopic = CurriculumTopic["subTopics"][number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى منهج الدورة");
      }

      try {
        const { id } = await params;
        const subject = await prisma.subject.findUnique({
          where: { id },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                subTopics: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        });

        if (!subject) {
          return badRequestResponse("الدورة غير موجودة");
        }

        const typedSubject = subject as CurriculumSubject;

        return successResponse({
          course: {
            id: typedSubject.id,
            name: typedSubject.name,
            nameAr: typedSubject.nameAr,
          },
          curriculum: typedSubject.topics.map((topic: CurriculumTopic) => ({
            id: topic.id,
            name: topic.name,
            order: topic.order,
            subTopics: topic.subTopics.map((subTopic: CurriculumSubTopic) => ({
              id: subTopic.id,
              name: subTopic.name,
              order: subTopic.order,
              type: subTopic.type,
              videoUrl: subTopic.videoUrl,
              duration: subTopic.duration,
              isFree: subTopic.isFree,
              description: subTopic.description,
            })),
          })),
        });
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتعديل منهج الدورة");
      }

      try {
        const { id } = await params;
        const body = await req.json();
        const curriculum = body?.curriculum;

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("بيانات المنهج غير صالحة");
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const existingTopics = await tx.topic.findMany({
            where: { subjectId: id },
            select: { id: true },
          });
          const existingTopicIds = existingTopics.map((topic: { id: string }) => topic.id);
          const receivedTopicIds = (curriculum as CurriculumTopicInput[])
            .filter((topic) => !topic.id.startsWith("new-"))
            .map((topic) => topic.id);

          const topicsToDelete = existingTopicIds.filter((topicId: string) => !receivedTopicIds.includes(topicId));
          if (topicsToDelete.length > 0) {
            await tx.topic.deleteMany({
              where: { id: { in: topicsToDelete } },
            });
          }

          for (const [topicOrder, topicInput] of (curriculum as CurriculumTopicInput[]).entries()) {
            const topic = topicInput.id.startsWith("new-")
              ? await tx.topic.create({
                  data: {
                    subjectId: id,
                    name: topicInput.name,
                    order: topicOrder,
                  },
                })
              : await tx.topic.update({
                  where: { id: topicInput.id },
                  data: {
                    name: topicInput.name,
                    order: topicOrder,
                  },
                });

            const existingSubTopics = await tx.subTopic.findMany({
              where: { topicId: topic.id },
              select: { id: true },
            });
            const existingSubTopicIds = existingSubTopics.map((subTopic: { id: string }) => subTopic.id);
            const receivedSubTopicIds = (topicInput.subTopics || [])
              .filter((lesson) => !lesson.id.startsWith("new-"))
              .map((lesson) => lesson.id);

            const subTopicsToDelete = existingSubTopicIds.filter(
              (subTopicId: string) => !receivedSubTopicIds.includes(subTopicId)
            );
            if (subTopicsToDelete.length > 0) {
              await tx.subTopic.deleteMany({
                where: { id: { in: subTopicsToDelete } },
              });
            }

            for (const [lessonOrder, lesson] of (topicInput.subTopics || []).entries()) {
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

        const updatedSubject = await prisma.subject.findUnique({
          where: { id },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                subTopics: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        });

        const typedUpdatedSubject = updatedSubject as CurriculumSubject | null;

        return successResponse(
          {
            curriculum:
              typedUpdatedSubject?.topics.map((topic: CurriculumTopic) => ({
                id: topic.id,
                name: topic.name,
                order: topic.order,
                subTopics: topic.subTopics.map((subTopic: CurriculumSubTopic) => ({
                  id: subTopic.id,
                  name: subTopic.name,
                  order: subTopic.order,
                  type: subTopic.type,
                  videoUrl: subTopic.videoUrl,
                  duration: subTopic.duration,
                  isFree: subTopic.isFree,
                  description: subTopic.description,
                })),
              })) || [],
          },
          "تم حفظ منهج الدورة بنجاح"
        );
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}
