
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { authService } from '@/lib/services/auth-service';
import { verifyTOTP } from '@/lib/two-factor/totp-service';
import { logger } from '@/lib/logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logSecurityEventSafely, extractRequestMetadata } from '@/lib/auth-utils';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            const { code } = await req.json();

            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }
            const token = authHeader.substring(7);
            const secretKey = new TextEncoder().encode(process.env.JWT_SECRET!);
            const { payload } = await jwtVerify(token, secretKey);
            const userId = payload.userId as string;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, email: true, name: true, role: true,
                    twoFactorEnabled: true, twoFactorSecret: true, recoveryCodes: true
                }
            });

            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            if (!code) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
            if (!user.twoFactorSecret) return NextResponse.json({ error: '2FA not set up' }, { status: 400 });

            // Check lockout status
            const lockoutStatus = await authService.get2FALockoutStatus(user.id);
            if (lockoutStatus.locked) {
                return NextResponse.json(
                    {
                        error: `تم حظر محاولات التحقق مؤقتاً. يمكنك المحاولة مرة أخرى بعد ${lockoutStatus.lockedUntil?.toLocaleTimeString()}`,
                        code: 'ACCOUNT_LOCKED',
                        lockedUntil: lockoutStatus.lockedUntil
                    },
                    { status: 403 }
                );
            }

            const { ip, userAgent } = extractRequestMetadata(req);
            const clientId = `${ip}-${userAgent}`;

            // Rate Limit for Management
            try {
                await authService.checkRateLimit(clientId);
            } catch (error) {
                logSecurityEventSafely(userId, 'two_factor_rate_limit', { userAgent, ip });
                return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
            }

            const totpResult = verifyTOTP(user.twoFactorSecret, code);
            const isValid = totpResult.valid;

            if (!isValid) {
                await authService.recordFailed2FAAttempt(user.id);
                logSecurityEventSafely(user.id, 'two_factor_verify_failed', { userAgent, method: 'TOTP', ip });
                securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_FAILED', ip, userAgent, metadata: { method: 'TOTP' } });
                return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
            }

            await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
            await authService.resetRateLimit(clientId);

            logSecurityEventSafely(user.id, 'two_factor_enabled', { userAgent, method: 'TOTP', ip });
            securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_ENABLED', ip, userAgent, metadata: { method: 'TOTP' } });
            securityNotificationService.notify2FAStatusChange(user.id, true, ip);

            return NextResponse.json({ message: 'تم تفعيل المصادقة الثنائية بنجاح' });
        } catch (error) {
            logger.error('2FA verify error:', error);
            return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 });
        }
    });
}
