import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, notFoundResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET a single event by ID
export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
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
        return notFoundResponse("المناسبة غير موجودة");
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

      return successResponse(transformedEvent);
    } catch (error) {
      logger.error("Error fetching event:", error);
      return handleApiError(error);
    }
  });
}