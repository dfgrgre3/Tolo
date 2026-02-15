import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { getLoginAnalytics, getLoginTrends } from '@/lib/login-analytics';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/analytics
 * الحصول على إحصائيات تسجيل الدخول
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من التوكن
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'غير مصرح' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const verification = await authService.verifyTokenFromInput(token);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'رمز غير صالح' },
          { status: 401 }
        );
      }

      // Get query parameters
      const searchParams = req.nextUrl.searchParams;
      const period = (searchParams.get('period') as any) || 'month';
      const userId = searchParams.get('userId') || verification.user.userId;
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
      logger.error('Analytics error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء جلب الإحصائيات' },
        { status: 500 }
      );
    }
  });
}

