
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
        { error: "ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ط·ظ„ظˆط¨" },
        { status: 400 }
      );
    }

    // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط¬ظ…ظٹط¹ ط§ظ„ط¯ط±ط¬ط§طھ ط§ظ„ظ…ط³ط¬ظ„ط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
    const userGrades = await prisma.userGrade.findMany({
      where: { userId },
      orderBy: {
        date: 'desc'
      }
    });

    // ط­ط³ط§ط¨ ط§ظ„ظ…طھظˆط³ط· ط§ظ„ط¹ط§ظ… ظ„ظƒظ„ ظ…ط§ط¯ط©
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
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ط¨ظٹط§ظ†ط§طھ" },
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
        { error: "ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©" },
        { status: 400 }
      );
    }

    // طھط³ط¬ظٹظ„ ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط¬ط¯ظٹط¯ط©
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
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط­ظپط¸ ط§ظ„ط¨ظٹط§ظ†ط§طھ" },
      { status: 500 }
    );
    }
  });
}
