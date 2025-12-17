import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
    createStandardErrorResponse,
    createSuccessResponse,
    emailSchema,
    parseRequestBody,
    extractRequestMetadata,
    logSecurityEventSafely,
    withDatabaseQuery
} from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

const verifyCodeSchema = z.object({
    email: emailSchema,
    code: z.string().length(6, 'رمز التحقق يجب أن يكون 6 أرقام'),
});

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        const { ip, userAgent } = extractRequestMetadata(req);

        const bodyResult = await parseRequestBody<{
            email?: string;
            code?: string;
        }>(req, { required: true });

        if (!bodyResult.success) {
            return bodyResult.error;
        }

        const parsed = verifyCodeSchema.safeParse(bodyResult.data);

        if (!parsed.success) {
            return createStandardErrorResponse(
                {
                    error: 'VALIDATION_ERROR',
                    details: parsed.error.flatten().fieldErrors,
                },
                'بيانات غير صالحة',
                400
            );
        }

        const { email, code } = parsed.data;

        // Find user with valid reset token
        const userResult = await withDatabaseQuery(
            () => prisma.user.findFirst({
                where: {
                    email,
                    resetToken: code,
                    resetTokenExpires: {
                        gte: new Date(),
                    },
                },
                select: {
                    id: true,
                    email: true,
                    resetToken: true,
                },
            })
        );

        if (!userResult.success) {
            return userResult.response;
        }

        const user = userResult.data;

        if (!user) {
            await logSecurityEventSafely(null, 'verify_reset_code_failed', {
                ip,
                userAgent,
                email,
            });

            return createStandardErrorResponse(
                null,
                'رمز التحقق غير صحيح أو منتهي الصلاحية',
                400
            );
        }

        await logSecurityEventSafely(user.id, 'verify_reset_code_success', {
            ip,
            userAgent,
        });

        return createSuccessResponse({
            message: 'تم التحقق بنجاح',
            resetToken: user.resetToken, // Return token to be used in reset password step
        });
    });
}
