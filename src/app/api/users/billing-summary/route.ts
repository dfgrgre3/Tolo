import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription-service';
import { getRequestUserId } from '@/lib/request-auth';

import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await SubscriptionService.getBillingSummary(userId);
    if (!summary) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error: any) {
    logger.error('Billing Summary Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
