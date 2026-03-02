
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
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
        include: {
          subject: {
            select: { nameAr: true, name: true }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      // حساب المتوسط العام لكل مادة
      const subjectAverages = await prisma.userGrade.groupBy({
        by: ['subjectId'],
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

      // البحث عن المادة في قاعدة البيانات
      const dbSubject = await prisma.subject.findFirst({
        where: {
          OR: [
            { name: { equals: subject, mode: 'insensitive' } },
            { nameAr: { equals: subject, mode: 'insensitive' } }
          ]
        }
      });

      if (!dbSubject) {
        return NextResponse.json(
          { error: `المادة ${subject} غير موجودة` },
          { status: 404 }
        );
      }

      // تسجيل الدرجة الجديدة
      const newGrade = await prisma.userGrade.create({
        data: {
          userId,
          subjectId: dbSubject.id,
          grade: Number(grade),
          maxGrade: Number(maxGrade),
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
