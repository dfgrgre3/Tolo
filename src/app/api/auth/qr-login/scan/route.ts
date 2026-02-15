/**
 * 📱 QR Login Scan API
 * 
 * تسجيل مسح QR Code من الموبايل
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { getQRLoginService } from '@/lib/auth/qr-login-service';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {

        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'يجب تسجيل الدخول أولاً' },
                { status: 401 }
            );
        }

        // Verify token
        const verification = await authService.verifyTokenFromInput(token);

        if (!verification.isValid || !verification.user?.userId) {
            return NextResponse.json(
                { error: 'جلسة غير صالحة' },
                { status: 401 }
            );
        }

        const userId = verification.user.userId;
        const { sessionId, device } = await request.json();

        if (!sessionId) {
            return NextResponse.json(
                { error: 'معرف الجلسة مطلوب' },
                { status: 400 }
            );
        }

        const headersList = await headers();
        const userAgent = device || headersList.get('user-agent') || 'Unknown Device';

        const qrService = getQRLoginService();
        const qrSession = await qrService.markAsScanned(
            sessionId,
            userId,
            userAgent
        );

        if (!qrSession) {
            return NextResponse.json(
                { error: 'الجلسة غير صالحة أو منتهية' },
                { status: 400 }
            );
        }

        logger.info('QR session scanned', {
            sessionId,
            userId,
        });

        return NextResponse.json({
            success: true,
            sessionId: qrSession.id,
            browserInfo: qrSession.browserInfo,
            ipAddress: qrSession.ipAddress,
            expiresAt: qrSession.expiresAt.toISOString(),
        });

    } catch (error) {
        logger.error('QR login scan error:', error);

        return NextResponse.json(
            { error: 'فشل في تسجيل المسح' },
            { status: 500 }
        );
    }
}
