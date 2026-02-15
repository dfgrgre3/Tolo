import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import { authService } from '@/lib/services/auth-service';
import { AccountRecoveryService } from '@/lib/services/account-recovery-service';
import {
    createStandardErrorResponse,
    createSuccessResponse,
    parseRequestBody,
    extractRequestMetadata,
    logSecurityEventSafely,
    addSecurityHeaders
} from '@/app/api/auth/_helpers';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z.string().email('البريد الإلكتروني غير صالح'),
});

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        const { ip, userAgent } = extractRequestMetadata(req);

        try {
            const bodyResult = await parseRequestBody<{ email?: string }>(req, {
                maxSize: 1024,
                required: true,
            });

            if (!bodyResult.success) {
                return bodyResult.error;
            }

            const parsed = forgotPasswordSchema.safeParse(bodyResult.data);

            if (!parsed.success) {
                return createStandardErrorResponse(
                    {
                        error: 'VALIDATION_ERROR',
                        details: parsed.error.flatten().fieldErrors,
                    },
                    'البيانات المدخلة غير صحيحة.',
                    400
                );
            }

            const { email } = parsed.data;

            // Delegate to authService
            try {
                const result = await AccountRecoveryService.initiateRecovery(email, 'email');
                if (!result.success && process.env.NODE_ENV === 'development') {
                    logger.warn(`Password reset initiated result: ${result.message}`);
                }
            } catch (serviceError) {
                logger.error('Password reset request failed:', serviceError);
            }

            await logSecurityEventSafely(null, 'forgot_password_request', {
                email,
                ip,
                userAgent,
            });

            return createSuccessResponse({
                message: 'إذا كان البريد الإلكتروني مسجلاً لدينا، سيتم إرسال رابط إعادة تعيين كلمة المرور.',
            });

        } catch (error) {
            logger.error('Forgot password route error:', error);
            return createStandardErrorResponse(
                error,
                'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.'
            );
        }
    });
}
