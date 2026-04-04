import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

// GET /api/admin/audit-logs - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const cursor = searchParams.get("cursor");
    const eventType = searchParams.get("eventType");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    if (!cursor && (Number.isNaN(offset) || offset < 0)) {
      return NextResponse.json({ error: "Invalid offset parameter" }, { status: 400 });
    }

    const where = {
      AND: [
        eventType ? { eventType } : {},
        userId ? { userId } : {},
        startDate ? { createdAt: { gte: new Date(startDate) } } : {},
        endDate ? { createdAt: { lte: new Date(endDate) } } : {},
      ],
    };

    const [fetchedLogs, total] = await Promise.all([
      prisma.securityLog.findMany({
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
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      prisma.securityLog.count({ where }),
    ]);

    const eventTypes = await prisma.securityLog.findMany({
      distinct: ["eventType"],
      select: { eventType: true },
    });

    const hasMore = fetchedLogs.length > limit;
    const logs = hasMore ? fetchedLogs.slice(0, limit) : fetchedLogs;

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        total,
        offset: cursor ? undefined : offset,
        hasMore,
        nextCursor: hasMore ? logs[logs.length - 1]?.id ?? null : null,
      },
      eventTypes: eventTypes.map((e: any) => e.eventType),
    });
  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¬ظ„ط¨ ط§ظ„ط³ط¬ظ„ط§طھ" },
      { status: 500 }
    );
  }
}
