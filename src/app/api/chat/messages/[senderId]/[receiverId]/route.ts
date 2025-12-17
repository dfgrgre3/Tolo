import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET messages between two users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ senderId: string; receiverId: string }> }
) {
  return opsWrapper(request, async () => {
    try {
      const { senderId, receiverId } = await params;

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

      return NextResponse.json(messages);
    } catch (error) {
      logger.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب الرسائل" },
        { status: 500 }
      );
    }
  });
}
