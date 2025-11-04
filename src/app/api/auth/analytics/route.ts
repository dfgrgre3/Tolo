import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { getLoginAnalytics, getLoginTrends } from '@/lib/login-analytics';

/**
 * GET /api/auth/analytics
 * الحصول على إحصائيات تسجيل الدخول
 */
export async function GET(request: NextRequest) {
  try {
    // التحقق من التوكن
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyToken(token);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as any) || 'month';
    const userId = searchParams.get('userId') || verification.user.id;
    const includeTrends = searchParams.get('trends') === 'true';

    // Get analytics
    const analytics = await getLoginAnalytics(userId, { period });

    // Get trends if requested
    let trends = null;
    if (includeTrends) {
      const days = period === 'day' ? 7 : period === 'week' ? 30 : period === 'month' ? 90 : 365;
      trends = await getLoginTrends(userId, days);
    }

    return NextResponse.json({
      analytics,
      ...(trends && { trends }),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الإحصائيات' },
      { status: 500 }
    );
  }
}

