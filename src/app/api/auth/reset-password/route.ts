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
} from '@/lib/auth-utils';
import { z } from 'zod';

import { passwordSchema } from '@/lib/validations/auth';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'رمز إعادة التعيين مطلوب'),
    password: passwordSchema,
});

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        const { ip, userAgent } = extractRequestMetadata(req);

        try {
            const bodyResult = await parseRequestBody<{ token?: string; password?: string }>(req, {
                maxSize: 1024,
                required: true,
            });

            if (!bodyResult.success) {
                return bodyResult.error;
            }

            const parsed = resetPasswordSchema.safeParse(bodyResult.data);

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

            const { token, password } = parsed.data;

            const result = await AccountRecoveryService.completeRecovery(token, password);
            if (!result.success) {
                throw new Error(result.message || 'فشل إعادة تعيين كلمة المرور');
            }

            await logSecurityEventSafely(null, 'password_reset_success', {
                ip,
                userAgent,
            });

            return createSuccessResponse({
                message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
            });

        } catch (error) {
            logger.error('Reset password route error:', error);
            return createStandardErrorResponse(
                error,
                'حدث خطأ أثناء إعادة تعيين كلمة المرور. قد يكون الرابط منتهي الصلاحية.'
            );
        }
    });
}
