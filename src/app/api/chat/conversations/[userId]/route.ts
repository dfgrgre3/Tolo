import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all conversations for a user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    // Get all messages where the user is either sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Group messages by conversation partner and get the latest message for each
    const conversationMap = new Map<string, any>();

    for (const message of messages) {
      const partnerId = message.senderId === userId ? message.receiverId : message.senderId;

      if (!conversationMap.has(partnerId)) {
        // Get partner info
        const partner = await prisma.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            name: true,
            avatar: true,
            lastSeen: true
          }
        });

        if (partner) {
          // Count unread messages
          const unreadCount = await prisma.message.count({
            where: {
              senderId: partnerId,
              receiverId: userId,
              isRead: false
            }
          });

          conversationMap.set(partnerId, {
            id: `conv-${userId}-${partnerId}`,
            userId: partnerId,
            name: partner.name,
            avatar: partner.avatar,
            lastSeen: partner.lastSeen,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            unreadCount,
            isOnline: false // This would be determined by a real-time system
          });
        }
      }
    }

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب المحادثات" },
      { status: 500 }
    );
  }
}
