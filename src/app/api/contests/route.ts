import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all contests
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    const contests = await prisma.contest.findMany({
      orderBy: {
        startDate: "asc"
      }
    });

    // Transform the data to match the frontend structure
    const transformedContests = contests.map((contest: any) => ({
      id: contest.id,
      title: contest.title,
      description: contest.description,
      // imageUrl: contest.imageUrl, // Not in schema
      startDate: contest.startDate.toISOString(),
      endDate: contest.endDate.toISOString(),
      prize: contest.prizes, // Schema has prizes (Json)
      // category: contest.category, // Not in schema
      // organizerName: contest.organizer?.name, // Not in schema
      // tags: contest.tags, // Not in schema
      // participantsCount: contest._count?.participants // Not in schema
    }));

    return NextResponse.json(transformedContests);
  } catch (error) {
    logger.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المسابقات" },
      { status: 500 }
    );
    }
  });
}

// POST create a new contest
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { 
        userId, 
        title, 
        description, 
        imageUrl, 
        startDate, 
        endDate, 
        prize, 
        category, 
        tags 
      } = await req.json();

    if (!userId || !title || !description || !startDate || !endDate) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const newContest = await prisma.contest.create({
      data: {
        title,
        description,
        // imageUrl, // Not in schema
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prizes: prize ? JSON.stringify(prize) : undefined, // Schema has prizes
        // category, // Not in schema
        // organizerId: userId, // Not in schema
        // tags: tags || [] // Not in schema
      }
    });

    // Transform the data to match the frontend structure
    const transformedContest = {
      id: newContest.id,
      title: newContest.title,
      description: newContest.description,
      // imageUrl: newContest.imageUrl,
      startDate: newContest.startDate.toISOString(),
      endDate: newContest.endDate.toISOString(),
      prize: newContest.prizes,
      // category: newContest.category,
      // organizerName: user.name,
      // tags: newContest.tags,
      // participantsCount: 0
    };

    return NextResponse.json(transformedContest, { status: 201 });
  } catch (error) {
    logger.error("Error creating contest:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء المسابقة" },
      { status: 500 }
    );
    }
  });
}
