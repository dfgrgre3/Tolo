
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-service';
import { sendMultiChannelNotification } from '@/lib/notification-sender-new';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
  try {
    // Verify authentication
    const decodedToken = verifyToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'تنسيق البيانات غير صحيح' },
        { status: 400 }
      );
    }

    const { title, message, type = 'info', channels = ['app'], actionUrl, icon } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'العنوان والرسالة مطلوبان' },
        { status: 400 }
      );
    }

    // Validate channels
    const validChannels = ['app', 'email', 'sms'];
    const invalidChannels = channels.filter((ch: string) => !validChannels.includes(ch));
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { error: `قنوات غير صحيحة: ${invalidChannels.join(', ')}. القنوات الصحيحة: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `نوع غير صحيح: ${type}. الأنواع الصحيحة: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Send notification through requested channels
    const results = await sendMultiChannelNotification({
      userId: decodedToken.userId,
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
      return NextResponse.json(
        { 
          error: 'فشل إرسال الإشعار عبر جميع القنوات المطلوبة',
          results,
          message: 'يرجى التحقق من إعدادات المستخدم ومتغيرات البيئة'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'تم إرسال الإشعار بنجاح'
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Error sending notification:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('المستخدم غير موجود')) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'فشل إرسال الإشعار',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
  });
}
