import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMultiChannelNotification } from '@/services/notification-sender';

import { logger } from '@/lib/logger';

/**
 * CRON Job to check for subscriptions expiring in 3 days.
 * Recommended schedule: Daily at 9:00 AM
 */
export async function GET(req: Request) {
  try {
    // SECURITY: Use a secret header for CRON security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // For local development, allow if no secret set
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Normalize to date start/end for exact matching
    const startOfTarget = new Date(threeDaysFromNow);
    startOfTarget.setHours(0, 0, 0, 0);
    const endOfTarget = new Date(threeDaysFromNow);
    endOfTarget.setHours(23, 59, 59, 999);

    // Find subscriptions expiring exactly 3 days from now
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: startOfTarget,
          lte: endOfTarget
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { nameAr: true } }
      }
    });

    logger.info(`[CRON] Found ${expiringSubscriptions.length} subscriptions expiring in 3 days.`);

    // Send notifications
    const results = await Promise.all(expiringSubscriptions.map(async (sub: any) => {
      return await sendMultiChannelNotification({
        userId: sub.userId,
        title: 'أوشك اشتراكك على الانتهاء âڈ³',
        message: `مرحباً ${sub.user.name || 'بك'}، سينتهي اشتراكك في باقة "${sub.plan.nameAr || 'المنصة'}" خلال 3 أيام. قم بالتجديد الآن لضمان استمرار وصولك للمواد.`,
        type: 'warning',
        icon: 'âڑ ï¸ڈ',
        channels: ['app', 'email'],
        actionUrl: '/billing'
      });
    }));

    return NextResponse.json({ 
      success: true, 
      processedCount: expiringSubscriptions.length,
      notificationsSent: results.length
    });

  } catch (error: any) {
    logger.error('CRON check-expiries Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
