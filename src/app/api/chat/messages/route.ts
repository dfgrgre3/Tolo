import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// POST create a new message
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { senderId, receiverId, content } = await req.json();

    if (!senderId || !receiverId || !content) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    // Check if users exist
    const sender = await prisma.user.findUnique({
      where: { id: senderId }
    });

    if (!sender) {
      return NextResponse.json(
        { error: "المرسل غير موجود" },
        { status: 404 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "المستقبل غير موجود" },
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
      { error: "حدث خطأ في إرسال الرسالة" },
      { status: 500 }
    );
    }
  });
}
