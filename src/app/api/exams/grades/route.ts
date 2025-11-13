
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // الحصول على جميع الامتحانات التي أخذها المستخدم
    const userExams = await prisma.examResult.findMany({
      where: { userId },
      include: {
        exam: true
      },
      orderBy: {
        takenAt: 'desc'
      }
    });

    // الحصول على جميع الدرجات المسجلة للمستخدم
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
      { error: "حدث خطأ في جلب البيانات" },
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
        { error: "البيانات المطلوبة غير مكتملة" },
        { status: 400 }
      );
    }

    // التحقق من وجود الامتحان
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    });

    if (!exam) {
      return NextResponse.json(
        { error: "الامتحان غير موجود" },
        { status: 404 }
      );
    }

    // تسجيل نتيجة الامتحان
    const examResult = await prisma.examResult.create({
      data: {
        userId,
        examId,
        score,
        takenAt: new Date(),
        teacherId: teacherId || null
      }
    });

    // إذا كانت هناك ملاحظات، قم بحفظها كدرجة منفصلة
    if (notes) {
      await prisma.userGrade.create({
        data: {
          userId,
          subject: exam.subject,
          grade: score,
          maxGrade: 100,
          date: new Date(),
          notes,
          isOnline: isOnline || false,
          examResultId: examResult.id
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
      { error: "حدث خطأ في حفظ البيانات" },
      { status: 500 }
    );
    }
  });
}
