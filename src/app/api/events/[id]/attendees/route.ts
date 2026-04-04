import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

interface UserSummary {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface EventAttendeeResponse {
  id: string;
  name: string;
  avatar: string | null;
  joinedAt: string;
}

// GET all attendees for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      
      // Pagination
      const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
      const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
      const skip = (page - 1) * limit;

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!event) {
        return notFoundResponse("المناسبة غير موجودة");
      }

      // Fetch attendees with user details in a single query (JOIN)
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
          createdAt: "asc"
        },
        skip,
        take: limit
      });

      // Transform the data efficiently
      const transformedAttendees = attendees.map((a): EventAttendeeResponse => ({
        id: a.user.id,
        name: a.user.name || 'Unknown',
        avatar: a.user.avatar,
        joinedAt: a.createdAt.toISOString()
      }));

      return successResponse({
        attendees: transformedAttendees,
        pagination: {
          page,
          limit,
          count: transformedAttendees.length
        }
      });
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

        // Use a transaction to prevent race conditions when checking maxAttendees
        const result = await prisma.$transaction(async (tx) => {
          // 1. Check if event exists and get current attendee count
          const event = await tx.event.findUnique({
            where: { id },
            include: {
              _count: {
                select: { attendees: true }
              }
            }
          });

          if (!event) return { error: "NOT_FOUND" };

          // 2. Check if limit reached
          if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
            return { error: "LIMIT_REACHED" };
          }

          // 3. Check for existing attendance
          const existing = await tx.eventAttendee.findUnique({
            where: { eventId_userId: { eventId: id, userId } }
          });

          if (existing) return { error: "ALREADY_JOINED" };

          // 4. Create attendance and return it with user details
          return await tx.eventAttendee.create({
            data: { eventId: id, userId },
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              }
            }
          });
        });

        if ('error' in result) {
          if (result.error === "NOT_FOUND") return notFoundResponse("المناسبة غير موجودة");
          if (result.error === "LIMIT_REACHED") return badRequestResponse("وصل الحد الأقصى للمشاركين");
          if (result.error === "ALREADY_JOINED") return badRequestResponse("المستخدم مشارك بالفعل");
        }

        const attendee = result as any; // Typed via include above
        const response: EventAttendeeResponse = {
          id: attendee.user.id,
          name: attendee.user.name || 'Unknown',
          avatar: attendee.user.avatar,
          joinedAt: attendee.createdAt.toISOString()
        };

        return successResponse(response, undefined, 201);
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

        // Delete directly to save a query. Prisma will throw if not found.
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
        // Handle record not found as 404
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
          return notFoundResponse("المستخدم غير مشارك في هذه المناسبة");
        }
        
        logger.error("Error leaving event:", error);
        return handleApiError(error);
      }
    });
  });
}
