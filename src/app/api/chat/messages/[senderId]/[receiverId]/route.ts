import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError, unauthorizedResponse } from '@/lib/api-utils';
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

        // Ensure the authenticated user is either the sender or receiver
        if (userId !== senderId && userId !== receiverId) {
          return unauthorizedResponse('You can only view your own messages');
        }

        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId }
            ]
          },
          orderBy: {
            createdAt: "asc"
          }
        });

        // Mark messages as read
        await prisma.message.updateMany({
          where: {
            senderId: receiverId,
            receiverId: senderId,
            isRead: false
          },
          data: {
            isRead: true
          }
        });

        return successResponse(messages);
      } catch (error) {
        logger.error("Error fetching messages:", error);
        return handleApiError(error);
      }
    });
  });
}
