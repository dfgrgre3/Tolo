
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { authService } from '@/lib/services/auth-service';
import { verifyTOTP, disableTOTP } from '@/lib/two-factor/totp-service';
import { verifyAndConsumeRecoveryCode } from '@/lib/two-factor/recovery-codes';
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
            if (!user.twoFactorEnabled) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });

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

            let isValid = false;
            if (user.twoFactorSecret) {
                const totpResult = verifyTOTP(user.twoFactorSecret, code);
                isValid = totpResult.valid;
            }
            if (!isValid) isValid = await verifyAndConsumeRecoveryCode(user.id, code);

            if (!isValid) {
                await authService.recordFailed2FAAttempt(user.id);
                logSecurityEventSafely(user.id, 'two_factor_disable_failed', { userAgent, reason: 'invalid_code', ip });
                securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_DISABLED', ip, userAgent, metadata: { reason: 'invalid_code' } });
                return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
            }

            await disableTOTP(user.id);
            await authService.resetRateLimit(clientId);

            logSecurityEventSafely(user.id, 'two_factor_disabled', { userAgent, ip });
            securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_DISABLED', ip, userAgent });
            securityNotificationService.notify2FAStatusChange(user.id, false, ip);

            return NextResponse.json({ message: 'تم إلغاء تفعيل المصادقة الثنائية بنجاح' });
        } catch (error) {
            logger.error('2FA disable error:', error);
            return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
        }
    });
}
