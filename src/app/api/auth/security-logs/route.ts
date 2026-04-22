import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth, badRequestResponse, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/auth/security-logs
 *
 * Retrieves the security audit logs for the authenticated user.
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      const cursor = searchParams.get('cursor');

      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return badRequestResponse('Invalid limit parameter');
      }

      if (!cursor && (Number.isNaN(offset) || offset < 0)) {
        return badRequestResponse('Invalid offset parameter');
      }

      const [fetchedLogs, total] = await Promise.all([
        prisma.securityLog.findMany({
          where: { userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
              }
            : {
                skip: offset,
              }),
        }),
        prisma.securityLog.count({
          where: { userId },
        })
      ]);

      const hasMore = fetchedLogs.length > limit;
      const logs = hasMore ? fetchedLogs.slice(0, limit) : fetchedLogs;

      return NextResponse.json({
        logs,
        pagination: {
          total,
          limit,
          offset: cursor ? undefined : offset,
          hasMore,
          nextCursor: hasMore ? logs[logs.length - 1]?.id ?? null : null,
        }
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
