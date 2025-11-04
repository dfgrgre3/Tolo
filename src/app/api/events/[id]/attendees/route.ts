import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all attendees for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        joinedAt: "asc"
      }
    });

    // Transform the data to match the frontend structure
    const transformedAttendees = attendees.map((attendee: any) => ({
      id: attendee.user.id,
      name: attendee.user.name,
      avatar: attendee.user.avatar,
      joinedAt: attendee.joinedAt.toISOString()
    }));

    return NextResponse.json(transformedAttendees);
  } catch (error) {
    console.error("Error fetching event attendees:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المشاركين" },
      { status: 500 }
    );
  }
}

// POST to join an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

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
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return NextResponse.json({
      id: newAttendee.user.id,
      name: newAttendee.user.name,
      avatar: newAttendee.user.avatar,
      joinedAt: newAttendee.joinedAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error("Error joining event:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الانضمام للمناسبة" },
      { status: 500 }
    );
  }
}

// DELETE to leave an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

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
    console.error("Error leaving event:", error);
    return NextResponse.json(
      { error: "حدث خطأ في مغادرة المناسبة" },
      { status: 500 }
    );
  }
}
