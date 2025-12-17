/**
 * 📱 Create QR Login Session API
 * 
 * إنشاء جلسة تسجيل دخول عبر QR Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQRLoginService } from '@/lib/auth/qr-login-service';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const headersList = await headers();

        const browserInfo = body.browserInfo || headersList.get('user-agent') || '';
        const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
            headersList.get('x-real-ip') ||
            '127.0.0.1';

        const qrService = getQRLoginService();
        const session = await qrService.createSession(browserInfo, ipAddress);

        logger.info('QR login session created', {
            sessionId: session.id,
            ip: ipAddress,
        });

        return NextResponse.json({
            sessionId: session.id,
            qrData: qrService.generateQRData(session),
            expiresAt: session.expiresAt.toISOString(),
            expiresIn: qrService.getRemainingTime(session),
        });

    } catch (error) {
        logger.error('QR login create error:', error);

        return NextResponse.json(
            { error: 'فشل في إنشاء جلسة QR' },
            { status: 500 }
        );
    }
}
