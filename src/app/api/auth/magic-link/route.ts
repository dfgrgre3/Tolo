import { NextRequest, NextResponse } from 'next/server';
import { createAndSendMagicLink } from '@/lib/passwordless/magic-link-service';
import { authService } from '@/lib/auth-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/magic-link
 * طلب رابط سحري لتسجيل الدخول
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'صيغة البريد الإلكتروني غير صحيحة' },
        { status: 400 }
      );
    }

      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);

    const result = await createAndSendMagicLink(email, ip, userAgent);

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'إذا كان البريد مسجلاً لدينا، ستتلقى رابط تسجيل الدخول.',
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    logger.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إرسال رابط تسجيل الدخول' },
      { status: 500 }
    );
    }
  });
}

