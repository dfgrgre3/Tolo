import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session-service';
import { withAuth, handleApiError } from '@/lib/api-utils';

/**
 * POST /api/admin/cleanup-sessions
 *
 * يحذف الجلسات المنتهية الصلاحية والجلسات الملغاة القديمة.
 * متاح للمشرفين (ADMIN) فقط.
 *
 * الاستخدام:
 *   fetch('/api/admin/cleanup-sessions', { method: 'POST', credentials: 'include' })
 */
export async function POST(req: NextRequest) {
    return withAuth(req, async ({ role }) => {
        try {
            if (role !== 'ADMIN') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const deleted = await SessionService.cleanupExpiredSessions();

            return NextResponse.json({
                success: true,
                message: `تم حذف ${deleted} جلسة قديمة بنجاح.`,
                deletedCount: deleted,
            });
        } catch (error) {
            return handleApiError(error);
        }
    });
}
