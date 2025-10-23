
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sendMultiChannelNotification } from '@/lib/notification-sender-new';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const { title, message, type = 'info', channels = ['app'], actionUrl, icon } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'العنوان والرسالة مطلوبان' },
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

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'تم إرسال الإشعار بنجاح'
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'فشل إرسال الإشعار' },
      { status: 500 }
    );
  }
}
