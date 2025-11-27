import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all attendees for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return NextResponse.json(
        { error: "المناسبة غير موجودة" },
        { status: 404 }
      );
    }

    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      orderBy: {
        createdAt: "asc"
      }
    });

    // Fetch user details manually since relation is missing
    const userIds = attendees.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Transform the data to match the frontend structure
    const transformedAttendees = attendees.map((attendee: any) => {
      const user = userMap.get(attendee.userId);
      return {
        id: user?.id || attendee.userId,
        name: user?.name || 'Unknown',
        avatar: user?.avatar || null,
        joinedAt: attendee.createdAt.toISOString()
      };
    });

    return NextResponse.json(transformedAttendees);
  } catch (error) {
    logger.error("Error fetching event attendees:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المشاركين" },
      { status: 500 }
    );
    }
  });
}

// POST to join an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { attendees: true }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: "المناسبة غير موجودة" },
        { status: 404 }
      );
    }

    // Check if max attendees limit reached
    if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
      return NextResponse.json(
        { error: "وصل الحد الأقصى للمشاركين" },
        { status: 400 }
      );
    }

    // Check if user is already attending
    const existingAttendance = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId
        }
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "المستخدم مشارك بالفعل" },
        { status: 400 }
      );
    }

    // Add attendee
    const newAttendee = await prisma.eventAttendee.create({
      data: {
        eventId: id,
        userId
      }
    });

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    });

    return NextResponse.json({
      id: user?.id || userId,
      name: user?.name || 'Unknown',
      avatar: user?.avatar || null,
      joinedAt: newAttendee.createdAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    logger.error("Error joining event:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الانضمام للمناسبة" },
      { status: 500 }
    );
    }
  });
}

// DELETE to leave an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // Check if attendance exists
    const attendance = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId
        }
      }
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "المستخدم غير مشارك في هذه المناسبة" },
        { status: 404 }
      );
    }

    // Remove attendee
    await prisma.eventAttendee.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error leaving event:", error);
    return NextResponse.json(
      { error: "حدث خطأ في مغادرة المناسبة" },
      { status: 500 }
    );
    }
  });
}
