import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// POST create a new message
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { receiverId, content } = await req.json();

        if (!receiverId || !content) {
          return badRequestResponse("All fields are required");
        }

        // Check if users exist
        const sender = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!sender) {
          return notFoundResponse("Sender not found");
        }

        const receiver = await prisma.user.findUnique({
          where: { id: receiverId }
        });

        if (!receiver) {
          return notFoundResponse("Receiver not found");
        }

        const newMessage = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content,
            isRead: false
          }
        });

        return successResponse(newMessage, undefined, 201);
      } catch (error) {
        logger.error("Error creating message:", error);
        return handleApiError(error);
      }
    });
  });
}
