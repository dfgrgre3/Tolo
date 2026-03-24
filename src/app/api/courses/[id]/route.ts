import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetEnhanced } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET a specific subject by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

      // Try to get from cache first
      const subject = await getOrSetEnhanced(
        `subject:${id}`,
        async () => {
          return await prisma.subject.findUnique({
            where: { id }
          });
        }
      );

      if (!subject) {
        return NextResponse.json(
          { error: "المادة غير موجودة" },
          { status: 404 }
        );
      }

      // Check enrollment if userId is provided
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get("userId");
      let enrollment = null;

      if (userId) {
        enrollment = await prisma.subjectEnrollment.findFirst({
          where: {
            userId,
            subjectId: subject.id
          }
        });
      }

      return NextResponse.json({
        subject,
        enrollment
      });
    } catch (error) {
      logger.error("Error fetching subject:", error);
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}

// DELETE a subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!subject) {
        return NextResponse.json(
          { error: "المادة غير موجودة" },
          { status: 404 }
        );
      }

      // Delete related data in order to avoid foreign key constraints
      await prisma.$transaction(async (tx: any) => {
        // Delete enrollments first
        await tx.subjectEnrollment.deleteMany({
          where: { subjectId: id }
        });

        // Delete study sessions
        await tx.studySession.deleteMany({
          where: { subjectId: id }
        });

        // Delete tasks
        await tx.task.deleteMany({
          where: { subjectId: id }
        });

        // Delete challenge completions
        await tx.challengeCompletion.deleteMany({
          where: {
            challenge: {
              subjectId: id
            }
          }
        });

        // Delete challenges
        await tx.challenge.deleteMany({
          where: { subjectId: id }
        });

        // Delete leaderboard entries
        await tx.leaderboardEntry.deleteMany({
          where: { subjectId: id }
        });

        // Delete AI generated content
        await tx.aiGeneratedContent.deleteMany({
          where: { subjectId: id }
        });

        // Delete schedules
        await tx.schedule.deleteMany({
          where: { subjectId: id }
        });

        // Delete AI generated exams
        await tx.aiGeneratedExam.deleteMany({
          where: { subjectId: id }
        });

        // Delete the subject (this will cascade delete related records)
        await tx.subject.delete({
          where: { id }
        });
      });

      return NextResponse.json(
        { message: "تم حذف المادة بنجاح" },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Error deleting subject:", error);

      // Handle specific foreign key constraint errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const { id } = await params; // Re-deconstruct params here for error handling

        if (errorMessage.includes('foreign key constraint') ||
          errorMessage.includes('violates foreign key') ||
          errorMessage.includes('still referenced')) {

          // Try to identify what's blocking the deletion
          let blockingInfo = "";
          try {
            const blockingData = await prisma.$transaction(async (tx: any) => {
              const enrollments = await tx.subjectEnrollment.count({ where: { subjectId: id } });
              const studySessions = await tx.studySession.count({ where: { subjectId: id } });
              const tasks = await tx.task.count({ where: { subjectId: id } });
              const challenges = await tx.challenge.count({ where: { subjectId: id } });
              const schedules = await tx.schedule.count({ where: { subjectId: id } });

              return { enrollments, studySessions, tasks, challenges, schedules };
            });

            const issues = [];
            if (blockingData.enrollments > 0) issues.push(`${blockingData.enrollments} تسجيلات طلاب`);
            if (blockingData.studySessions > 0) issues.push(`${blockingData.studySessions} جلسات دراسة`);
            if (blockingData.tasks > 0) issues.push(`${blockingData.tasks} مهام`);
            if (blockingData.challenges > 0) issues.push(`${blockingData.challenges} تحديات`);
            if (blockingData.schedules > 0) issues.push(`${blockingData.schedules} جداول`);

            if (issues.length > 0) {
              blockingInfo = `\nالبيانات المرتبطة: ${issues.join(', ')}`;
            }
          } catch (countError) {
            // Ignore counting errors, just return generic message
          }

          return NextResponse.json(
            {
              error: `لا يمكن حذف المادة بسبب وجود بيانات مرتبطة بها.${blockingInfo}\n\nيتم حذف هذه البيانات تلقائياً. يرجى المحاولة مرة أخرى.`
            },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}

// PUT to update a subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const data = await req.json();

      // Update the subject
      const updatedSubject = await prisma.subject.update({
        where: { id },
        data
      });

      return NextResponse.json(updatedSubject);
    } catch (error) {
      logger.error("Error updating subject:", error);
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  });
}
