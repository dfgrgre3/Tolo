import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError, unauthorizedResponse, badRequestResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET messages between two users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ senderId: string; receiverId: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { senderId, receiverId } = await params;
        const { searchParams } = new URL(req.url);
        const before = searchParams.get("before");
        const limitParam = searchParams.get("limit") || "50";
        const limit = Number.parseInt(limitParam, 10);

        if (userId !== senderId && userId !== receiverId) {
          return unauthorizedResponse('You can only view your own messages');
        }

        if (Number.isNaN(limit) || limit < 1 || limit > 100) {
          return badRequestResponse("Invalid limit parameter");
        }

        const fetchedMessages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId }
            ]
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
          ...(before
            ? {
                cursor: { id: before },
                skip: 1,
              }
            : {}),
        });

        const hasMore = fetchedMessages.length > limit;
        const messagesWindow = hasMore ? fetchedMessages.slice(0, limit) : fetchedMessages;
        const messages = messagesWindow.reverse();

        return successResponse({
          messages,
          hasMore,
          nextCursor: hasMore ? messages[0]?.id ?? null : null,
        });
      } catch (error) {
        logger.error("Error fetching messages:", error);
        return handleApiError(error);
      }
    });
  });
}
