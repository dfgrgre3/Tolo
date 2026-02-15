/**
 * 🚪 Revoke All Sessions API
 * 
 * إنهاء جميع الجلسات الأخرى للمستخدم الحالي
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {

        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'غير مصرح لك بالوصول' },
                { status: 401 }
            );
        }

        // Find session by refresh token
        const currentSession = await prisma.session.findFirst({
            where: {
                refreshToken: token,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            select: { id: true, userId: true },
        });

        if (!currentSession) {
            return NextResponse.json(
                { error: 'جلسة غير صالحة' },
                { status: 401 }
            );
        }

        const userId = currentSession.userId;
        const currentSessionId = currentSession.id;

        // Delete all other sessions for this user
        const result = await prisma.session.deleteMany({
            where: {
                userId: userId,
                id: {
                    not: currentSessionId,
                },
            },
        });

        logger.info('Revoked all other sessions', {
            userId,
            revokedCount: result.count,
        });

        return NextResponse.json({
            success: true,
            message: `تم إنهاء ${result.count} جلسة بنجاح`,
            revokedCount: result.count,
        });

    } catch (error) {
        logger.error('Error revoking all sessions:', error);

        return NextResponse.json(
            { error: 'حدث خطأ أثناء إنهاء الجلسات' },
            { status: 500 }
        );
    }
}
