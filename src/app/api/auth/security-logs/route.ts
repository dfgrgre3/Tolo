import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/security-logs
 * الحصول على سجلات الأمان للمستخدم
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication via middleware headers
      const userId = req.headers.get("x-user-id");

      if (!userId) {
        return NextResponse.json(
          { error: 'غير مصرح' },
          { status: 401 }
        );
      }

      // الحصول على معاملات البحث
      const searchParams = req.nextUrl.searchParams;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const eventType = searchParams.get('eventType');

      let logs;
      if (eventType) {
        logs = await securityLogger.getLogsByEventType(
          userId,
          eventType as any,
          limit
        );
      } else {
        logs = await securityLogger.getUserSecurityLogs(
          userId,
          limit,
          offset
        );
      }

      return NextResponse.json({
        logs,
        total: logs.length,
      });
    } catch (error) {
      logger.error('Security logs error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء جلب السجلات' },
        { status: 500 }
      );
    }
  });
}

