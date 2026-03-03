import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
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
        return notFoundResponse("المناسبة غير موجودة");
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
      const transformedAttendees = attendees.map((attendee) => {
        const user = userMap.get(attendee.userId);
        return {
          id: user?.id || attendee.userId,
          name: user?.name || 'Unknown',
          avatar: user?.avatar || null,
          joinedAt: attendee.createdAt.toISOString()
        };
      });

      return successResponse(transformedAttendees);
    } catch (error: unknown) {
      logger.error("Error fetching event attendees:", error);
      return handleApiError(error);
    }
  });
}

// POST to join an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

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
          return notFoundResponse("المناسبة غير موجودة");
        }

        // Check if max attendees limit reached
        if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
          return badRequestResponse("وصل الحد الأقصى للمشاركين");
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
          return badRequestResponse("المستخدم مشارك بالفعل");
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

        return successResponse({
          id: user?.id || userId,
          name: user?.name || 'Unknown',
          avatar: user?.avatar || null,
          joinedAt: newAttendee.createdAt.toISOString()
        }, undefined, 201);
      } catch (error: unknown) {
        logger.error("Error joining event:", error);
        return handleApiError(error);
      }
    });
  });
}

// DELETE to leave an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

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
          return notFoundResponse("المستخدم غير مشارك في هذه المناسبة");
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

        return successResponse({ success: true });
      } catch (error: unknown) {
        logger.error("Error leaving event:", error);
        return handleApiError(error);
      }
    });
  });
}
