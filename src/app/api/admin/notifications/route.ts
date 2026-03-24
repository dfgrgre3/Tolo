import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/notifications - Get admin notifications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const skip = (page - 1) * limit;

    // Get admin user IDs first
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u: any) => u.id);

    const where = {
      userId: { in: adminIds },
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: { in: adminIds }, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإشعارات" },
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
      // Get admin user IDs first
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      const adminIds = adminUsers.map((u: any) => u.id);

      await prisma.notification.updateMany({
        where: { userId: { in: adminIds }, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "معرف الإشعار مطلوب" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الإشعار" },
      { status: 500 }
    );
  }
}
