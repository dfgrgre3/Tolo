import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// POST create a new message
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { senderId, receiverId, content } = await req.json();

    if (!senderId || !receiverId || !content) {
      return NextResponse.json(
        { error: "ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ظٹط¬ط¨ ظ…ظ„ط¤ظ‡ط§" },
        { status: 400 }
      );
    }

    // Check if users exist
    const sender = await prisma.user.findUnique({
      where: { id: senderId }
    });

    if (!sender) {
      return NextResponse.json(
        { error: "ط§ظ„ظ…ط±ط³ظ„ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
        { status: 404 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "ط§ظ„ظ…ط³طھظ‚ط¨ظ„ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" },
        { status: 404 }
      );
    }

    const newMessage = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        isRead: false
      }
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    logger.error("Error creating message:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط©" },
      { status: 500 }
    );
    }
  });
}
