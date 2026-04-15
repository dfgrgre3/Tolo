import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError, unauthorizedResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET /api/chat/conversations/[userId]
// High-performance rewrite to avoid N+1 queries and memory exhaustion
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId: authUserId }) => {
      try {
        const { userId } = await params;

        if (userId !== authUserId) {
          return unauthorizedResponse('You can only view your own conversations');
        }

        // 1. Get unique conversation partners with their last message date
        // Note: Using raw SQL or complex group by is usually better, 
        // but we can optimize with Prisma by fetching the latest messages first
        const recentMessages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId },
              { receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 500, // Safety boundary for performance
          select: {
            senderId: true,
            receiverId: true,
            content: true,
            createdAt: true,
            isRead: true,
            id: true
          }
        });

        const partnersMap = new Map<string, any>();
        
        for (const msg of recentMessages) {
          const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
          if (!partnersMap.has(partnerId)) {
            partnersMap.set(partnerId, {
              lastMessage: msg.content,
              lastMessageTime: msg.createdAt,
              // We'll count unread properly in a batch later
              unreadCount: 0 
            });
          }
        }

        const partnerIds = Array.from(partnersMap.keys());

        if (partnerIds.length === 0) {
          return successResponse([]);
        }

        // 2. Batch fetch ALL partners info in ONE query
        const partners = await prisma.user.findMany({
          where: { id: { in: partnerIds } },
          select: {
            id: true,
            name: true,
            avatar: true,
            lastLogin: true
          }
        });

        // 3. Batch fetch ALL unread counts for these partners in ONE query
        const unreadCounts = await (prisma.message as any).groupBy({
          by: ['senderId'],
          where: {
            receiverId: userId,
            senderId: { in: partnerIds },
            isRead: false
          },
          _count: { id: true }
        });

        const unreadMap = new Map(unreadCounts.map((u: { senderId: string; _count: { id: number } }) => [u.senderId, u._count.id]));

        // 4. Assemble final list
        const conversations = partners.map((partner: { id: string; name: string | null; avatar: string | null; lastLogin: Date | null }) => {
          const stats = partnersMap.get(partner.id);
          return {
            id: `conv-${userId}-${partner.id}`,
            userId: partner.id,
            name: partner.name,
            avatar: partner.avatar,
            lastSeen: partner.lastLogin,
            lastMessage: stats.lastMessage,
            lastMessageTime: stats.lastMessageTime,
            unreadCount: unreadMap.get(partner.id) || 0,
            isOnline: false 
          };
        }).sort((a: { lastMessageTime: Date | string }, b: { lastMessageTime: Date | string }) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );

        return successResponse(conversations);
      } catch (error: unknown) {
        logger.error("Critical Error fetching conversations:", error);
        return handleApiError(error);
      }
    });
  });
}

