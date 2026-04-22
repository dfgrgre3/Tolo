import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { extractClientInfo, handleApiError, RateLimiter } from '@/lib/api-utils';
import { z } from 'zod';

const sendSchema = z.object({
    phone: z.string().min(10, 'رقم الهاتف غير صحيح').max(15, 'رقم الهاتف طويل جداً'),
});

const sendCodeRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 3,
    lockoutMs: 30 * 60 * 1000,
});

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ip, userAgent } = extractClientInfo(req);
        
        // Rate limiting
        const rateLimitResult = await sendCodeRateLimiter.checkRateLimit(`verify-phone-send:${userId}`);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: `يرجى الانتظار ${Math.ceil((rateLimitResult.remainingTime || 15))} دقيقة قبل المحاولة مرة أخرى` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const validation = sendSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const result = await AuthService.sendPhoneVerification(userId, validation.data.phone, ip, userAgent);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
        }

        await sendCodeRateLimiter.incrementAttempts(`verify-phone-send:${userId}`);

        return NextResponse.json({ success: true, message: 'تم إرسال كود التحقق بنجاح' });
    } catch (error) {
        return handleApiError(error);
    }
}
