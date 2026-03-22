import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { extractClientInfo, handleApiError, RateLimiter } from '@/lib/api-utils';
import { z } from 'zod';

const verifySchema = z.object({
    code: z.string().length(6, 'كود التحقق يجب أن يتكون من 6 أرقام'),
});

const verifyCodeRateLimiter = new RateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5,
    lockoutMs: 20 * 60 * 1000,
});

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ip, userAgent } = extractClientInfo(req);

        // Rate limiting to prevent brute force
        const rateLimitResult = await verifyCodeRateLimiter.checkRateLimit(`verify-phone-verify:${userId}`);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const validation = verifySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const result = await AuthService.verifyPhone(userId, validation.data.code, ip, userAgent);

        if (!result.success) {
            await verifyCodeRateLimiter.incrementAttempts(`verify-phone-verify:${userId}`);
            return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
        }

        await verifyCodeRateLimiter.resetAttempts(`verify-phone-verify:${userId}`);

        return NextResponse.json({ success: true, message: 'تم تفعيل رقم الهاتف بنجاح' });
    } catch (error) {
        return handleApiError(error);
    }
}
