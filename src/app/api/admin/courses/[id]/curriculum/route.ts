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
  description?: string | null;
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

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getCurriculumStats(topics: CurriculumTopic[]) {
  const lessonsCount = topics.reduce((sum, topic) => sum + topic.subTopics.length, 0);
  const freeLessonsCount = topics.reduce(
    (sum, topic) => sum + topic.subTopics.filter((subTopic) => subTopic.isFree).length,
    0
  );
  const totalDurationMinutes = topics.reduce(
    (sum, topic) =>
      sum +
      topic.subTopics.reduce(
        (lessonSum, subTopic) => lessonSum + (subTopic.durationMinutes || 0),
        0
      ),
    0
  );

  return {
    chaptersCount: topics.length,
    lessonsCount,
    freeLessonsCount,
    totalDurationMinutes,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ظ…ظ†ظ‡ط¬ ط§ظ„ط¯ظˆط±ط©");
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
          return badRequestResponse("ط§ظ„ط¯ظˆط±ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©");
        }

        const typedSubject = subject as CurriculumSubject;

        const stats = getCurriculumStats(typedSubject.topics);

        return successResponse({
          course: {
            id: typedSubject.id,
            name: typedSubject.name,
            nameAr: typedSubject.nameAr,
          },
          stats,
          curriculum: typedSubject.topics.map((topic: CurriculumTopic) => ({
            id: topic.id,
            name: topic.title,
            order: topic.order,
            description: topic.description,
            subTopics: topic.subTopics.map((subTopic: CurriculumSubTopic) => ({
              id: subTopic.id,
              name: subTopic.title,
              order: subTopic.order,
              type: subTopic.type,
              videoUrl: subTopic.videoUrl,
              duration: subTopic.durationMinutes,
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
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨طھط¹ط¯ظٹظ„ ظ…ظ†ظ‡ط¬ ط§ظ„ط¯ظˆط±ط©");
      }

      try {
        const { id } = await params;
        const body = await req.json();
        const curriculum = body?.curriculum;

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
                    title: topicInput.name,
                    description: normalizeText(topicInput.description),
                    order: topicOrder,
                  },
                })
              : await tx.topic.update({
                  where: { id: topicInput.id },
                  data: {
                    title: topicInput.name,
                    description: normalizeText(topicInput.description),
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
                title: lesson.name,
                order: lessonOrder,
                type: (lesson.type || "VIDEO") as LessonType,
                videoUrl: lesson.videoUrl || null,
                durationMinutes: lesson.duration || 0,
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

        const refreshedSubject = await prisma.subject.findUnique({
          where: { id },
          include: {
            topics: {
              include: {
                subTopics: true,
              },
            },
          },
        });

        const refreshedTopics = (refreshedSubject?.topics || []) as CurriculumTopic[];
        const refreshedStats = getCurriculumStats(refreshedTopics);

        await prisma.subject.update({
          where: { id },
          data: {
            videoCount: refreshedStats.lessonsCount,
            durationHours: Math.ceil(refreshedStats.totalDurationMinutes / 60),
            lastContentUpdate: new Date(),
          },
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

        const updatedStats = getCurriculumStats((typedUpdatedSubject?.topics || []) as CurriculumTopic[]);

        return successResponse(
          {
            stats: updatedStats,
            curriculum:
              typedUpdatedSubject?.topics.map((topic: CurriculumTopic) => ({
                id: topic.id,
                name: topic.title,
                order: topic.order,
                description: topic.description,
                subTopics: topic.subTopics.map((subTopic: CurriculumSubTopic) => ({
                  id: subTopic.id,
                  name: subTopic.title,
                  order: subTopic.order,
                  type: subTopic.type,
                  videoUrl: subTopic.videoUrl,
                  duration: subTopic.durationMinutes,
                  isFree: subTopic.isFree,
                  description: subTopic.description,
                })),
              })) || [],
          },
          "طھظ… ط­ظپط¸ ظ…ظ†ظ‡ط¬ ط§ظ„ط¯ظˆط±ط© ط¨ظ†ط¬ط§ط­"
        );
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

