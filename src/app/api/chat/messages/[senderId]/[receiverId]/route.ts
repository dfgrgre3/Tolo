import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET messages between two users
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ senderId: string; receiverId: string }> }
) {
  try {
    const { senderId, receiverId } = await context.params;

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
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الرسائل" },
      { status: 500 }
    );
  }
}
