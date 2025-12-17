/**
 * 📱 QR Login Status API
 * 
 * التحقق من حالة جلسة QR
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQRLoginService } from '@/lib/auth/qr-login-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'معرف الجلسة مطلوب' },
                { status: 400 }
            );
        }

        const qrService = getQRLoginService();
        const session = await qrService.getSession(sessionId);

        if (!session) {
            return NextResponse.json(
                { error: 'الجلسة غير موجودة' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            sessionId: session.id,
            status: session.status,
            scannedByDevice: session.scannedByDevice,
            scannedAt: session.scannedAt?.toISOString(),
            confirmedAt: session.confirmedAt?.toISOString(),
            userId: session.status === 'confirmed' ? session.scannedByUserId : undefined,
            remainingTime: qrService.getRemainingTime(session),
        });

    } catch (error) {
        logger.error('QR login status error:', error);

        return NextResponse.json(
            { error: 'فشل في التحقق من الحالة' },
            { status: 500 }
        );
    }
}
