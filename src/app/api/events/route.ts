import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, badRequestResponse, withAuth } from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';

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

      return successResponse(transformedEvents);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}

// POST create a new event
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAuth(req, async ({ userId }: { userId: string }) => {
      try {
        const eventBus = new EventBus();
        const {
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

        if (!title || !description || !startDate || !endDate || !category) {
          return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها", ERROR_CODES.MISSING_PARAMETER);
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return badRequestResponse("المستخدم غير موجود", ERROR_CODES.NOT_FOUND);
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

        return successResponse(transformedEvent, undefined, 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
