import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET a single event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { name: true }
        },
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

    // Transform the data to match the frontend structure
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      imageUrl: event.imageUrl,
      organizerId: event.organizerId,
      organizerName: event.organizer.name,
      category: event.category,
      isPublic: event.isPublic,
      maxAttendees: event.maxAttendees,
      currentAttendees: event._count.attendees,
      tags: event.tags
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب بيانات المناسبة" },
      { status: 500 }
    );
  }
}
