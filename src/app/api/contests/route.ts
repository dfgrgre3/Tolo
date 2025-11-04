import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all contests
export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        organizer: {
          select: { name: true }
        },
        _count: {
          select: { participants: true }
        }
      },
      orderBy: {
        startDate: "asc"
      }
    });

    // Transform the data to match the frontend structure
    const transformedContests = contests.map((contest: any) => ({
      id: contest.id,
      title: contest.title,
      description: contest.description,
      imageUrl: contest.imageUrl,
      startDate: contest.startDate.toISOString(),
      endDate: contest.endDate.toISOString(),
      prize: contest.prize,
      category: contest.category,
      organizerName: contest.organizer.name,
      tags: contest.tags,
      participantsCount: contest._count.participants
    }));

    return NextResponse.json(transformedContests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المسابقات" },
      { status: 500 }
    );
  }
}

// POST create a new contest
export async function POST(request: NextRequest) {
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
    } = await request.json();

    if (!userId || !title || !description || !startDate || !endDate || !category) {
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
        imageUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prize,
        category,
        organizerId: userId,
        tags: tags || []
      },
      include: {
        organizer: {
          select: { name: true }
        },
        _count: {
          select: { participants: true }
        }
      }
    });

    // Transform the data to match the frontend structure
    const transformedContest = {
      id: newContest.id,
      title: newContest.title,
      description: newContest.description,
      imageUrl: newContest.imageUrl,
      startDate: newContest.startDate.toISOString(),
      endDate: newContest.endDate.toISOString(),
      prize: newContest.prize,
      category: newContest.category,
      organizerName: newContest.organizer.name,
      tags: newContest.tags,
      participantsCount: newContest._count.participants
    };

    return NextResponse.json(transformedContest, { status: 201 });
  } catch (error) {
    console.error("Error creating contest:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء المسابقة" },
      { status: 500 }
    );
  }
}
