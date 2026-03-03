
import { NextRequest } from 'next/server';
import { sendMultiChannelNotification } from '@/lib/services/notification-sender';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { withAuth, successResponse, badRequestResponse, handleApiError, unauthorizedResponse, notFoundResponse } from '@/lib/api-utils';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        // Parse and validate request body
        let body;
        try {
          body = await req.json();
        } catch (error) {
          return badRequestResponse('تنسيق البيانات غير صحيح');
        }

        const { title, message, type = 'info', channels = ['app'], actionUrl, icon } = body;

        // Validate required fields
        if (!title || !message) {
          return badRequestResponse('العنوان والرسالة مطلوبان');
        }

        // Validate channels
        const validChannels = ['app', 'email', 'sms'];
        const invalidChannels = channels.filter((ch: string) => !validChannels.includes(ch));
        if (invalidChannels.length > 0) {
          return badRequestResponse(`قنوات غير صحيحة: ${invalidChannels.join(', ')}. القنوات الصحيحة: ${validChannels.join(', ')}`);
        }

        // Validate type
        const validTypes = ['info', 'success', 'warning', 'error'];
        if (!validTypes.includes(type)) {
          return badRequestResponse(`نوع غير صحيح: ${type}. الأنواع الصحيحة: ${validTypes.join(', ')}`);
        }

        // Send notification through requested channels
        const results = await sendMultiChannelNotification({
          userId,
          title,
          message,
          type,
          channels,
          actionUrl,
          icon
        });

        // Check if at least one channel succeeded
        const hasSuccess = results.app || results.email?.success || results.sms?.success;

        if (!hasSuccess) {
          return badRequestResponse('فشل إرسال الإشعار عبر جميع القنوات المطلوبة');
        }

        return successResponse({
          success: true,
          results,
          message: 'تم إرسال الإشعار بنجاح'
        }, undefined, 201);
      } catch (error: unknown) {
        logger.error('Error sending notification:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide more specific error messages
        if (errorMessage.includes('المستخدم غير موجود')) {
          return notFoundResponse('المستخدم غير موجود');
        }

        return handleApiError(error);
      }
    });
  });
}
