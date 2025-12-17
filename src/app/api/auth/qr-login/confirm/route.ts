/**
 * 📱 QR Login Confirm API
 * 
 * تأكيد تسجيل الدخول عبر QR Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { getQRLoginService } from '@/lib/auth/qr-login-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const authService = AuthService.getInstance();

        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'يجب تسجيل الدخول أولاً' },
                { status: 401 }
            );
        }

        // Verify token using refreshAccessToken since verifyToken may not exist
        // We'll create a simple token decode here
        let userId: string | null = null;

        try {
            // Try to get session from token
            const session = await prisma.session.findFirst({
                where: {
                    refreshToken: token,
                    isActive: true,
                    expiresAt: { gt: new Date() },
                },
                select: { userId: true },
            });

            if (session) {
                userId = session.userId;
            }
        } catch (error) {
            logger.warn('Token verification failed:', error);
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'جلسة غير صالحة' },
                { status: 401 }
            );
        }

        const { sessionId, token: qrToken } = await request.json();

        if (!sessionId || !qrToken) {
            return NextResponse.json(
                { error: 'بيانات ناقصة' },
                { status: 400 }
            );
        }

        const qrService = getQRLoginService();
        const qrSession = await qrService.confirmLogin(
            sessionId,
            qrToken,
            userId
        );

        if (!qrSession) {
            return NextResponse.json(
                { error: 'فشل تأكيد الجلسة' },
                { status: 400 }
            );
        }

        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'المستخدم غير موجود' },
                { status: 404 }
            );
        }

        // Create tokens for the web session
        const tokens = await authService.createTokens({
            id: user.id,
            email: user.email!,
            name: user.name || undefined,
            role: user.role || undefined,
        });

        // Log the security event
        await prisma.securityLog.create({
            data: {
                userId: user.id,
                eventType: 'QR_LOGIN_SUCCESS',
                ip: qrSession.ipAddress || '',
                userAgent: qrSession.browserInfo || '',
                metadata: JSON.stringify({
                    sessionId,
                    confirmedAt: qrSession.confirmedAt,
                }),
            },
        });

        logger.info('QR login confirmed', {
            sessionId,
            userId: user.id,
        });

        return NextResponse.json({
            success: true,
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });

    } catch (error) {
        logger.error('QR login confirm error:', error);

        return NextResponse.json(
            { error: 'فشل في تأكيد تسجيل الدخول' },
            { status: 500 }
        );
    }
}
