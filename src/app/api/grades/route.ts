
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // الحصول على جميع الدرجات المسجلة للمستخدم
    const userGrades = await prisma.userGrade.findMany({
      where: { userId },
      orderBy: {
        date: 'desc'
      }
    });

    // حساب المتوسط العام لكل مادة
    const subjectAverages = await prisma.userGrade.groupBy({
      by: ['subject'],
      where: { userId },
      _avg: {
        grade: true
      }
    });

    return NextResponse.json({
      grades: userGrades,
      averages: subjectAverages
    });
  } catch (error) {
    logger.error("Error fetching grades:", error);
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
      const { 
        userId, 
        subject, 
        grade, 
        maxGrade = 100, 
        date, 
        notes, 
        isOnline = false,
        teacherId,
        assignmentType 
      } = await req.json();

      if (!userId || !subject || grade === undefined) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة" },
        { status: 400 }
      );
    }

    // تسجيل الدرجة الجديدة
    const newGrade = await prisma.userGrade.create({
      data: {
        userId,
        subject,
        grade,
        maxGrade,
        date: date ? new Date(date) : new Date(),
        examName: assignmentType
      }
    });

    return NextResponse.json({
      success: true,
      grade: newGrade
    });
  } catch (error) {
    logger.error("Error saving grade:", error);
    return NextResponse.json(
      { error: "حدث خطأ في حفظ البيانات" },
      { status: 500 }
    );
    }
  });
}
