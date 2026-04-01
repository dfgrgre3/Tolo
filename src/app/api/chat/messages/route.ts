import { NextRequest } from "next/server";
import { prisma, Prisma } from '@/lib/db';
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

        // High-performance creation: skip redundant lookups, rely on DB Foreign Keys
        const newMessage = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content,
            isRead: false
          }
        });

        return successResponse(newMessage, undefined, 201);
      } catch (err: unknown) {
        const error = err as any;
        // Handle specifically missing foreign key (user not found)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
          return notFoundResponse("Recipient or sender account not valid.");
        }
        logger.error("Error creating message:", error);
        return handleApiError(error);
      }
    });
  });
}
