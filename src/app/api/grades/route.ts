
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
    console.error("Error fetching grades:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب البيانات" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    } = await request.json();

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
        notes,
        isOnline,
        teacherId,
        assignmentType
      }
    });

    return NextResponse.json({
      success: true,
      grade: newGrade
    });
  } catch (error) {
    console.error("Error saving grade:", error);
    return NextResponse.json(
      { error: "حدث خطأ في حفظ البيانات" },
      { status: 500 }
    );
  }
}
