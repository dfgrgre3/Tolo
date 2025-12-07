
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/lib/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ط·ظ„ظˆط¨" },
        { status: 400 }
      );
    }

    // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط¬ظ…ظٹط¹ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„طھظٹ ط£ط®ط°ظ‡ط§ ط§ظ„ظ…ط³طھط®ط¯ظ…
    const userExams = await prisma.examResult.findMany({
      where: { userId },
      include: {
        exam: true
      },
      orderBy: {
        takenAt: 'desc'
      }
    });

    // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط¬ظ…ظٹط¹ ط§ظ„ط¯ط±ط¬ط§طھ ط§ظ„ظ…ط³ط¬ظ„ط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
    const userGrades = await prisma.userGrade.findMany({
      where: { userId },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({
      exams: userExams,
      grades: userGrades
    });
  } catch (error) {
    logger.error("Error fetching exam grades:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ط¨ظٹط§ظ†ط§طھ" },
      { status: 500 }
    );
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { userId, examId, score, teacherId, isOnline, notes } = await req.json();

    if (!userId || !examId || score === undefined) {
      return NextResponse.json(
        { error: "ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©" },
        { status: 400 }
      );
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ط§ظ„ط§ظ…طھط­ط§ظ†
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    });

    if (!exam) {
      return NextResponse.json(
        { error: "ط§ظ„ط§ظ…طھط­ط§ظ† ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
        { status: 404 }
      );
    }

    // طھط³ط¬ظٹظ„ ظ†طھظٹط¬ط© ط§ظ„ط§ظ…طھط­ط§ظ†
    const examResult = await prisma.examResult.create({
      data: {
        userId,
        examId,
        score,
        takenAt: new Date(),
        teacherId: teacherId || null
      }
    });

    // ط¥ط°ط§ ظƒط§ظ†طھ ظ‡ظ†ط§ظƒ ظ…ظ„ط§ط­ط¸ط§طھطŒ ظ‚ظ… ط¨ط­ظپط¸ظ‡ط§ ظƒط¯ط±ط¬ط© ظ…ظ†ظپطµظ„ط©
    if (notes) {
      await prisma.userGrade.create({
        data: {
          userId,
          subject: exam.subject,
          grade: score,
          maxGrade: 100,
          date: new Date()
        }
      });
    }

    // Trigger gamification for exam completion
    try {
      await gamificationService.updateUserProgress(userId, 'exam_completed', { score });
    } catch (gamificationError) {
      logger.error('Error updating gamification for exam:', gamificationError);
      // Don't fail the request if gamification fails
    }

    return NextResponse.json({
      success: true,
      examResult
    });
  } catch (error) {
    logger.error("Error saving exam grade:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط­ظپط¸ ط§ظ„ط¨ظٹط§ظ†ط§طھ" },
      { status: 500 }
    );
    }
  });
}
