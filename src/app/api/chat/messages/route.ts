import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST create a new message
export async function POST(request: NextRequest) {
  try {
    const { senderId, receiverId, content } = await request.json();

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
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إرسال الرسالة" },
      { status: 500 }
    );
  }
}
