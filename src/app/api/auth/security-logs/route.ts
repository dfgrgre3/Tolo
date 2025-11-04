import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { securityLogger } from '@/lib/security-logger';

/**
 * GET /api/auth/security-logs
 * الحصول على سجلات الأمان للمستخدم
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

    // الحصول على معاملات البحث
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('eventType');

    let logs;
    if (eventType) {
      logs = await securityLogger.getLogsByEventType(
        verification.user.id,
        eventType as any,
        limit
      );
    } else {
      logs = await securityLogger.getUserSecurityLogs(
        verification.user.id,
        limit,
        offset
      );
    }

    return NextResponse.json({
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Security logs error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب السجلات' },
      { status: 500 }
    );
  }
}

