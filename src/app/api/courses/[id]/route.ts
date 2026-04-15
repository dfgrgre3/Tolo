import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/db";
import { getOrSetSubject, invalidateEducationalContent, invalidateEducationalContentPattern } from "@/lib/educational-cache-service";
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
      const subject = await getOrSetSubject(id, async () => {
        return await prisma.subject.findUnique({
          where: { id },
          include: {
            teachers: {
              select: {
                id: true,
                name: true,
                image: true,
                rating: true,
                bio: true,
              }
            },
            _count: {
              select: {
                topics: true,
                enrollments: true,
              }
            }
          }
        });
      }) as any;

      if (!subject) {
        return NextResponse.json(
          { error: "ط§ظ„ظ…ط§ط¯ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" },
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
            subjectId: subject.id,
            isDeleted: false
          }
        });
      }

      return NextResponse.json({
        ...subject,
        enrollment
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "ط®ط·ط£ ط؛ظٹط± ظ…ط¹ط±ظˆظپ";
      logger.error("Error fetching subject:", { error: errorMessage });
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط·ظ„ط¨" },
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
      const subjectResult = await prisma.subject.findUnique({
        where: { id }
      });

      if (!subjectResult) {
        return NextResponse.json(
          { error: "ط§ظ„ظ…ط§ط¯ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" },
          { status: 404 }
        );
      }

      // Delete related data in order to avoid foreign key constraints
      await (prisma as any).$transaction(async (tx: any) => {
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

      // Clear Caches
      await invalidateEducationalContent(`subject:${id}`);
      await invalidateEducationalContentPattern('courses:list:*');

      return NextResponse.json(
        { message: "طھظ… ط­ط°ظپ ط§ظ„ظ…ط§ط¯ط© ط¨ظ†ط¬ط§ط­" },
        { status: 200 }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error deleting subject:", { error: errorMessage });

      // Handle specific foreign key constraint errors
      if (error instanceof Error) {
        const errorMessageLower = error.message.toLowerCase();
        const { id } = await params; // Re-deconstruct params here for error handling

        if (errorMessageLower.includes('foreign key constraint') ||
          errorMessageLower.includes('violates foreign key') ||
          errorMessageLower.includes('still referenced')) {

          // Try to identify what's blocking the deletion
          let blockingInfo = "";
          try {
            const blockingData = await (prisma as any).$transaction(async (tx: any) => {
              const enrollments = await tx.subjectEnrollment.count({ where: { subjectId: id } });
              const studySessions = await tx.studySession.count({ where: { subjectId: id } });
              const tasks = await tx.task.count({ where: { subjectId: id } });
              const challenges = await tx.challenge.count({ where: { subjectId: id } });
              const schedules = await tx.schedule.count({ where: { subjectId: id } });

              return { enrollments, studySessions, tasks, challenges, schedules };
            });

            const issues = [];
            if (blockingData.enrollments > 0) issues.push(`${blockingData.enrollments} طھط³ط¬ظٹظ„ط§طھ ط·ظ„ط§ط¨`);
            if (blockingData.studySessions > 0) issues.push(`${blockingData.studySessions} ط¬ظ„ط³ط§طھ ط¯ط±ط§ط³ط©`);
            if (blockingData.tasks > 0) issues.push(`${blockingData.tasks} ظ…ظ‡ط§ظ…`);
            if (blockingData.challenges > 0) issues.push(`${blockingData.challenges} طھط­ط¯ظٹط§طھ`);
            if (blockingData.schedules > 0) issues.push(`${blockingData.schedules} ط¬ط¯ط§ظˆظ„`);

            if (issues.length > 0) {
              blockingInfo = `\nط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط±طھط¨ط·ط©: ${issues.join(', ')}`;
            }
          } catch (countError) {
            // Ignore counting errors, just return generic message
          }

          return NextResponse.json(
            {
              error: `ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ط§ظ„ظ…ط§ط¯ط© ط¨ط³ط¨ط¨ ظˆط¬ظˆط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط±طھط¨ط·ط© ط¨ظ‡ط§.${blockingInfo}\n\nظٹطھظ… ط­ط°ظپ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ طھظ„ظ‚ط§ط¦ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰.`
            },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط·ظ„ط¨" },
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

      // Clear Caches
      await invalidateEducationalContent(`subject:${id}`);
      await invalidateEducationalContentPattern('courses:list:*');

      return NextResponse.json(updatedSubject);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error updating subject:", { error: errorMessage });
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط·ظ„ط¨" },
        { status: 500 }
      );
    }
  });
}

