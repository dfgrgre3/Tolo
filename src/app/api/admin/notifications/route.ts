import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

// GET /api/admin/notifications - Get admin notifications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const cursor = searchParams.get("cursor");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    if (!cursor && (Number.isNaN(offset) || offset < 0)) {
      return NextResponse.json({ error: "Invalid offset parameter" }, { status: 400 });
    }

    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u: any) => u.id);

    const where = {
      userId: { in: adminIds },
      ...(unreadOnly ? { isRead: false } : {}),
      isDeleted: false,
    };

    const [fetchedNotifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {
              skip: offset,
            }),
        take: limit + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: { in: adminIds }, isRead: false, isDeleted: false },
      }),
    ]);

    const hasMore = fetchedNotifications.length > limit;
    const notifications = hasMore ? fetchedNotifications.slice(0, limit) : fetchedNotifications;

    return NextResponse.json({
      notifications,
      pagination: {
        limit,
        total,
        offset: cursor ? undefined : offset,
        hasMore,
        nextCursor: hasMore ? notifications[notifications.length - 1]?.id ?? null : null,
      },
      unreadCount,
    });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "طآ­طآ¯طآ« طآ®طآ·طآ£ طآ£طآ«ظâ€ طآ§ء طآ¬ظâ€‍طآ¨ طآ§ظâ€‍طآ¥طآ´طآ¹طآ§طآ±طآ§طھ" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      const adminIds = adminUsers.map((u: any) => u.id);

      await prisma.notification.updateMany({
        where: { userId: { in: adminIds }, isRead: false, isDeleted: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "طھظâ€¦ طھطآ­طآ¯يطآ¯ طآ¬ظâ€¦يطآ¹ طآ§ظâ€‍طآ¥طآ´طآ¹طآ§طآ±طآ§طھ ظئ’ظâ€¦ظâ€ڑطآ±ظث†ءطآ©" });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ظâ€¦طآ¹طآ±ف طآ§ظâ€‍طآ¥طآ´طآ¹طآ§طآ± ظâ€¦طآ·ظâ€‍ظث†طآ¨" }, { status: 400 });
  } catch (error) {
    logger.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "طآ­طآ¯طآ« طآ®طآ·طآ£ طآ£طآ«ظâ€ طآ§ء طھطآ­طآ¯يطآ« طآ§ظâ€‍طآ¥طآ´طآ¹طآ§طآ±" },
      { status: 500 }
    );
  }
}
