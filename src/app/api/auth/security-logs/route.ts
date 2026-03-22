import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withAuth } from '@/lib/api-utils';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/auth/security-logs
 * 
 * Retrieves the security audit logs for the authenticated user.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const { searchParams } = new URL(req.url);
            const limit = parseInt(searchParams.get('limit') || '50');
            const offset = parseInt(searchParams.get('offset') || '0');

            const logs = await prisma.securityLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            });

            const total = await prisma.securityLog.count({
                where: { userId },
            });

            return NextResponse.json({
                logs,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + logs.length < total
                }
            });
        } catch (error) {
            return handleApiError(error);
        }
    });
}
