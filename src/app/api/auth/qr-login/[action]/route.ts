import { NextRequest, NextResponse } from 'next/server';
import { getQRLoginService } from '@/lib/auth/qr-login-service';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const action = pathname.split('/').pop();

        if (action === 'create') {
            return await handleCreate(request);
        } else if (action === 'scan') {
            return await handleScan(request);
        } else if (action === 'confirm') {
            return await handleConfirm(request);
        } else {
            return NextResponse.json({ error: 'إجراء غير صحيح' }, { status: 400 });
        }
    } catch (error) {
        logger.error('QR login route error:', error);
        return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams, pathname } = new URL(request.url);
        const action = pathname.split('/').pop();

        if (action === 'status') {
            return await handleStatus(request, searchParams);
        } else {
            return NextResponse.json({ error: 'إجراء غير صحيح' }, { status: 400 });
        }
    } catch (error) {
        logger.error('QR login route error:', error);
        return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}

// -------------------------------------------------------------
// Action Handlers
// -------------------------------------------------------------

async function handleCreate(request: NextRequest) {
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
}

async function handleScan(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    // Verify token
    const verification = await authService.verifyTokenFromInput(token);

    if (!verification.isValid || !verification.user?.userId) {
        return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    const userId = verification.user.userId;
    const { sessionId, device } = await request.json();

    if (!sessionId) {
        return NextResponse.json({ error: 'معرف الجلسة مطلوب' }, { status: 400 });
    }

    const headersList = await headers();
    const userAgent = device || headersList.get('user-agent') || 'Unknown Device';

    const qrService = getQRLoginService();
    const qrSession = await qrService.markAsScanned(sessionId, userId, userAgent);

    if (!qrSession) {
        return NextResponse.json({ error: 'الجلسة غير صالحة أو منتهية' }, { status: 400 });
    }

    logger.info('QR session scanned', { sessionId, userId });

    return NextResponse.json({
        success: true,
        sessionId: qrSession.id,
        browserInfo: qrSession.browserInfo,
        ipAddress: qrSession.ipAddress,
        expiresAt: qrSession.expiresAt.toISOString(),
    });
}

async function handleConfirm(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    let userId: string | null = null;
    try {
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
        return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    const { sessionId, token: qrToken } = await request.json();

    if (!sessionId || !qrToken) {
        return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const qrService = getQRLoginService();
    const qrSession = await qrService.confirmLogin(sessionId, qrToken, userId);

    if (!qrSession) {
        return NextResponse.json({ error: 'فشل تأكيد الجلسة' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, avatar: true, role: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const tokens = await authService.createTokens({
        userId: user.id,
        email: user.email!,
        role: user.role || 'USER',
    });

    await prisma.securityLog.create({
        data: {
            userId: user.id,
            eventType: 'QR_LOGIN_SUCCESS',
            ip: qrSession.ipAddress || '',
            userAgent: qrSession.browserInfo || '',
            metadata: JSON.stringify({ sessionId, confirmedAt: qrSession.confirmedAt }),
        },
    });

    logger.info('QR login confirmed', { sessionId, userId: user.id });

    return NextResponse.json({
        success: true,
        userId: user.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    });
}

async function handleStatus(request: NextRequest, searchParams: URLSearchParams) {
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'معرف الجلسة مطلوب' }, { status: 400 });
    }

    const qrService = getQRLoginService();
    const session = await qrService.getSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404 });
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
}
