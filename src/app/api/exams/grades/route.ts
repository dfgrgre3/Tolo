
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
    console.error("Error fetching exam grades:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب البيانات" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, examId, score, teacherId, isOnline, notes } = await request.json();

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

    return NextResponse.json({
      success: true,
      examResult
    });
  } catch (error) {
    console.error("Error saving exam grade:", error);
    return NextResponse.json(
      { error: "حدث خطأ في حفظ البيانات" },
      { status: 500 }
    );
  }
}
