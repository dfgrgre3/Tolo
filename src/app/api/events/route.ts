import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all events
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
    const events = await prisma.event.findMany({
      include: {
        organizer: {
          select: { name: true }
        },
        _count: {
          select: { attendees: true }
        }
      },
      orderBy: {
        startDate: "desc"
      }
    });

    // Transform the data to match the frontend structure
    const transformedEvents = events.map((event: any) => ({
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
    }));

    return NextResponse.json(transformedEvents);
  } catch (error) {
    logger.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ظ…ظ†ط§ط³ط¨ط§طھ" },
      { status: 500 }
    );
    }
  });
}

// POST create a new event
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const eventBus = new EventBus();
      const { 
        userId, 
        title, 
        description, 
        location, 
        startDate, 
        endDate, 
        imageUrl, 
        category, 
        isPublic, 
        maxAttendees, 
        tags 
      } = await req.json();

    if (!userId || !title || !description || !startDate || !endDate || !category) {
      return NextResponse.json(
        { error: "ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ظٹط¬ط¨ ظ…ظ„ط¤ظ‡ط§" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
        { status: 404 }
      );
    }

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl,
        organizerId: userId,
        category,
        isPublic,
        maxAttendees,
        tags: tags || []
      },
      include: {
        organizer: {
          select: { name: true }
        },
        _count: {
          select: { attendees: true }
        }
      }
    });

    // Transform the data to match the frontend structure
    const transformedEvent = {
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      location: newEvent.location,
      startDate: newEvent.startDate.toISOString(),
      endDate: newEvent.endDate.toISOString(),
      imageUrl: newEvent.imageUrl,
      organizerId: newEvent.organizerId,
      organizerName: newEvent.organizer.name,
      category: newEvent.category,
      isPublic: newEvent.isPublic,
      maxAttendees: newEvent.maxAttendees,
      currentAttendees: newEvent._count.attendees,
      tags: newEvent.tags
    };

    await eventBus.publish('event.created', transformedEvent);

    return NextResponse.json(transformedEvent, { status: 201 });
  } catch (error) {
    logger.error("Error creating event:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ظ…ظ†ط§ط³ط¨ط©" },
      { status: 500 }
    );
    }
  });
}
