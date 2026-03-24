import { prisma } from "@/lib/db";
import { LessonType } from "@prisma/client";

export async function getCourseCurriculum(subjectId: string, userId?: string) {
  const topics = await (prisma.topic as any).findMany({
    where: { subjectId },
    orderBy: { order: "asc" },
    include: {
      subTopics: {
        orderBy: { order: "asc" },
        include: {
          attachments: true,
        },
      },
    },
  });

  if (!userId) {
    return topics;
  }

  // Get user progress
  const progress = await prisma.topicProgress.findMany({
    where: {
      userId,
      subTopic: {
        topic: {
          subjectId,
        },
      },
    },
    select: {
      subTopicId: true,
      completed: true,
      completedAt: true,
    },
  });

  const progressMap = new Map(progress.map((p: any) => [p.subTopicId, p]));

  return topics.map((topic: any) => ({
    ...topic,
    subTopics: topic.subTopics.map((subTopic: any) => ({
      ...subTopic,
      completed: (progressMap.get(subTopic.id) as any)?.completed ?? false,
      completedAt: (progressMap.get(subTopic.id) as any)?.completedAt ?? null,
    })),
  }));
}

export async function getCourseStats(subjectId: string) {
  const subject = await (prisma.subject as any).findUnique({
    where: { id: subjectId },
    include: {
      topics: {
        include: {
          subTopics: true,
        },
      },
      reviews: {
        select: { rating: true },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!subject) return null;

  const totalLessons = subject.topics.reduce((acc: number, t: any) => acc + t.subTopics.length, 0);
  const totalDuration = subject.topics.reduce(
    (acc: number, t: any) => acc + t.subTopics.reduce((subAcc: number, st: any) => subAcc + (st.duration || 0), 0),
    0
  );

  const avgRating =
    subject.reviews.length > 0
      ? subject.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / subject.reviews.length
      : subject.rating || 0;

  return {
    totalLessons,
    totalDuration,
    avgRating,
    reviewCount: subject.reviews.length,
    enrollmentCount: subject._count.enrollments,
  };
}

export async function createSubjectReview(
  subjectId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  const review = await (prisma as any).subjectReview.upsert({
    where: {
      subjectId_userId: { subjectId, userId },
    },
    update: {
      rating,
      comment,
    },
    create: {
      subjectId,
      userId,
      rating,
      comment,
    },
  });

  // Update subject aggregate rating
  const allReviews = await (prisma as any).subjectReview.findMany({
    where: { subjectId },
    select: { rating: true },
  });

  const avgRating = allReviews.length > 0
    ? allReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / allReviews.length
    : 0;

  await prisma.subject.update({
    where: { id: subjectId },
    data: { rating: avgRating },
  });

  return review;
}
