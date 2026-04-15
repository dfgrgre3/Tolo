/**
 * Course Integration Service
 * Central service that connects courses to all platform systems:
 * - Gamification (XP, Achievements)
 * - Notifications
 * - Certificates
 * - Analytics
 * - Progress tracking
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

// ============= XP Constants =============
const XP_REWARDS = {
  COURSE_ENROLL: 10,
  LESSON_COMPLETE: 5,
  CHAPTER_COMPLETE: 25,
  COURSE_COMPLETE: 100,
  FIRST_COURSE_BONUS: 50,
  REVIEW_SUBMIT: 10,
} as const;

// ============= Types =============
export interface EnrollmentResult {
  success: boolean;
  enrollment?: {
    id: string;
    userId: string;
    subjectId: string;
  };
  requiresPayment?: boolean;
  price?: number;
  message?: string;
  xpAwarded?: number;
  isFirstCourse?: boolean;
}

export interface LessonCompleteResult {
  success: boolean;
  xpAwarded: number;
  courseProgress: number;
  isChapterComplete: boolean;
  isCourseComplete: boolean;
  certificateCreated: boolean;
  chapterXP?: number;
  courseXP?: number;
}

export interface CourseProgressSummary {
  courseId: string;
  courseName: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastAccessedAt?: Date;
  certificateId?: string;
  certificateUrl?: string;
}

// ============= Service =============

/**
 * Handle course enrollment with full system integration
 */
export async function handleCourseEnrollment(
  userId: string,
  subjectId: string,
  tx?: Prisma.TransactionClient
): Promise<{ xpAwarded: number; isFirstCourse: boolean }> {
  const db = tx || prisma;

  try {
    // Check how many courses user is enrolled in
    const enrollmentCount = await db.subjectEnrollment.count({
      where: { userId, isDeleted: false },
    });

    const isFirstCourse = enrollmentCount === 0;
    let totalXP = XP_REWARDS.COURSE_ENROLL;

    if (isFirstCourse) {
      totalXP += XP_REWARDS.FIRST_COURSE_BONUS;
    }

    // Award XP
    await db.userXP.upsert({
      where: { userId },
      update: { totalXP: { increment: totalXP }, studyXP: { increment: totalXP } },
      create: { userId, totalXP, studyXP: totalXP },
    });

    // Update enrolled count on subject
    await db.subject.update({
      where: { id: subjectId },
      data: { enrolledCount: { increment: 1 } },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        title: "🎓 تم التسجيل بنجاح!",
        message: `مبروك! تم تسجيلك في الدورة بنجاح. ابدأ رحلة التعلم الآن واكسب ${totalXP} نقطة XP!`,
        type: "SUCCESS",
        actionUrl: `/learning/${subjectId}`,
        icon: "graduation-cap",
      },
    });

    // Award first course achievement if applicable
    if (isFirstCourse) {
      try {
        await db.userAchievement.create({
          data: {
            userId,
            achievementKey: "first_course",
          },
        });
      } catch {
        // Achievement may not exist in definitions or already unlocked
      }
    }

    return { xpAwarded: totalXP, isFirstCourse };
  } catch (error) {
    logger.error("[CourseIntegration] Error in handleCourseEnrollment:", error);
    return { xpAwarded: 0, isFirstCourse: false };
  }
}

/**
 * Handle lesson completion with gamification and progress tracking
 */
export async function handleLessonCompletion(
  userId: string,
  subTopicId: string,
  subjectId: string,
  tx?: Prisma.TransactionClient
): Promise<LessonCompleteResult> {
  const db = tx || prisma;
  const result: LessonCompleteResult = {
    success: false,
    xpAwarded: XP_REWARDS.LESSON_COMPLETE,
    courseProgress: 0,
    isChapterComplete: false,
    isCourseComplete: false,
    certificateCreated: false,
  };

  try {
    // 1. Award lesson XP
    await db.userXP.upsert({
      where: { userId },
      update: { totalXP: { increment: XP_REWARDS.LESSON_COMPLETE }, studyXP: { increment: XP_REWARDS.LESSON_COMPLETE } },
      create: { userId, totalXP: XP_REWARDS.LESSON_COMPLETE, studyXP: XP_REWARDS.LESSON_COMPLETE },
    });

    // 2. Check chapter completion
    const lesson = await db.subTopic.findUnique({
      where: { id: subTopicId },
      select: {
        topicId: true,
        topic: {
          select: {
            id: true,
            subjectId: true,
            subTopics: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (lesson) {
      const chapterLessonIds = lesson.topic.subTopics.map((st: any) => st.id);
      const completedInChapter = await db.topicProgress.count({
        where: {
          userId,
          subTopicId: { in: chapterLessonIds },
          completed: true,
        },
      });

      result.isChapterComplete = completedInChapter >= chapterLessonIds.length;

      if (result.isChapterComplete) {
        result.chapterXP = XP_REWARDS.CHAPTER_COMPLETE;
        result.xpAwarded += XP_REWARDS.CHAPTER_COMPLETE;

        await db.userXP.update({
          where: { userId },
          data: { totalXP: { increment: XP_REWARDS.CHAPTER_COMPLETE }, studyXP: { increment: XP_REWARDS.CHAPTER_COMPLETE } },
        });
      }
    }

    // 3. Calculate overall course progress
    const allLessons = await db.subTopic.count({
      where: { topic: { subjectId } },
    });

    const allLessonIds = await db.subTopic.findMany({
      where: { topic: { subjectId } },
      select: { id: true },
    });

    const completedLessons = await db.topicProgress.count({
      where: {
        userId,
        subTopicId: { in: allLessonIds.map((l: any) => l.id) },
        completed: true,
      },
    });

    result.courseProgress = allLessons > 0 ? Math.round((completedLessons / allLessons) * 100) : 0;

    // 3.5 Sync SubjectEnrollment (Denormalization)
    await db.subjectEnrollment.update({
      where: { userId_subjectId: { userId, subjectId } },
      data: {
        completedLessonsCount: completedLessons,
        progress: result.courseProgress,
      },
    });

    // 4. Check course completion
    result.isCourseComplete = result.courseProgress >= 100;

    if (result.isCourseComplete) {
      result.courseXP = XP_REWARDS.COURSE_COMPLETE;
      result.xpAwarded += XP_REWARDS.COURSE_COMPLETE;

      // Award course completion XP
      await db.userXP.update({
        where: { userId },
        data: { totalXP: { increment: XP_REWARDS.COURSE_COMPLETE }, studyXP: { increment: XP_REWARDS.COURSE_COMPLETE } },
      });

      // Create certificate
      try {
        await db.subjectCertificate.upsert({
          where: { subjectId_userId: { subjectId, userId } },
          update: {},
          create: {
            subjectId,
            userId,
            certUrl: `/certificates/${userId}_${subjectId}.pdf`,
          },
        });
        result.certificateCreated = true;
      } catch {
        // Certificate may already exist
      }

      // Get course name for notification
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { nameAr: true, name: true },
      });
      const courseName = subject?.nameAr || subject?.name || "الدورة";

      // Course completion notification
      await db.notification.create({
        data: {
          userId,
          title: "🏆 تهانينا! أتممت الدورة",
          message: `مبروك! لقد أتممت دورة "${courseName}" بنجاح واكتسبت ${XP_REWARDS.COURSE_COMPLETE} نقطة XP! شهادتك جاهزة.`,
          type: "SUCCESS",
          actionUrl: `/courses/${subjectId}`,
          icon: "trophy",
        },
      });

      // Try to award achievement
      try {
        // Count total completed courses
        const completedCourses = await db.subjectCertificate.count({
          where: { userId },
        });

        if (completedCourses === 1) {
          await db.userAchievement.create({
            data: { userId, achievementKey: "first_course_complete" },
          });
        } else if (completedCourses === 5) {
          await db.userAchievement.create({
            data: { userId, achievementKey: "five_courses_complete" },
          });
        }
      } catch {
        // Achievement may not exist or already unlocked
      }
    }

    // 5. Progress milestone notifications (50%, 75%)
    if (!result.isCourseComplete && result.courseProgress > 0) {
      const milestones = [50, 75];
      const previousProgress = allLessons > 0
        ? Math.round(((completedLessons - 1) / allLessons) * 100)
        : 0;

      for (const milestone of milestones) {
        if (result.courseProgress >= milestone && previousProgress < milestone) {
          await db.notification.create({
            data: {
              userId,
              title: `📈 أنجزت ${milestone}% من الدورة!`,
              message: `أنت تبلي بلاءً حسناً! واصل التقدم في الدورة.`,
              type: "INFO",
              actionUrl: `/learning/${subjectId}`,
              icon: "trending-up",
            },
          });
        }
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    logger.error("[CourseIntegration] Error in handleLessonCompletion:", error);
    return result;
  }
}

/**
 * Get comprehensive progress for user's courses
 */
export async function getUserCoursesProgress(
  userId: string
): Promise<CourseProgressSummary[]> {
  try {
    const enrollments = await prisma.subjectEnrollment.findMany({
      where: { userId, isDeleted: false },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            thumbnailUrl: true,
            level: true,
            topics: {
              select: {
                subTopics: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (enrollments.length === 0) return [];

    // Get all lesson IDs for all enrolled courses
    const allSubjectIds = enrollments.map((e: any) => e.subjectId);

    // Get certificates
    const certificates = await prisma.subjectCertificate.findMany({
      where: { userId, subjectId: { in: allSubjectIds } },
      select: { id: true, subjectId: true, certUrl: true },
    });
    const certMap = new Map<string, any>(certificates.map((c: any) => [c.subjectId, c]));

    return enrollments.map((enrollment: any) => {
      const totalLessons = enrollment.subject.topics.reduce(
        (acc: number, t: any) => acc + t.subTopics.length,
        0
      );

      const cert = certMap.get(enrollment.subjectId);

      return {
        courseId: enrollment.subjectId,
        courseName: enrollment.subject.nameAr || enrollment.subject.name,
        totalLessons,
        completedLessons: enrollment.completedLessonsCount,
        progressPercentage: enrollment.progress,
        lastAccessedAt: enrollment.updatedAt,
        certificateId: cert?.id as string,
        certificateUrl: (cert?.certUrl as string) ?? undefined,
      };
    });
  } catch (error) {
    logger.error("[CourseIntegration] Error getting user courses progress:", error);
    return [];
  }
}

/**
 * Handle review submission with XP reward
 */
export async function handleReviewSubmission(
  userId: string,
  subjectId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; xpAwarded: number }> {
  try {
    // Create or update review
    await prisma.subjectReview.upsert({
      where: { subjectId_userId: { subjectId, userId } },
      update: { rating, comment },
      create: { subjectId, userId, rating, comment },
    });

    // Recalculate subject average rating
    const reviews = await prisma.subjectReview.findMany({
      where: { subjectId },
      select: { rating: true },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;


    await prisma.subject.update({
      where: { id: subjectId },
      data: { rating: parseFloat(avgRating.toFixed(1)) },
    });

    // Award XP for review
    await prisma.userXP.upsert({
      where: { userId },
      update: { totalXP: { increment: XP_REWARDS.REVIEW_SUBMIT } },
      create: { userId, totalXP: XP_REWARDS.REVIEW_SUBMIT },
    });

    return { success: true, xpAwarded: XP_REWARDS.REVIEW_SUBMIT };
  } catch (error) {
    logger.error("[CourseIntegration] Error in handleReviewSubmission:", error);
    return { success: false, xpAwarded: 0 };
  }
}
