import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription-service';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    // In production, add secret header check to prevent unauthorized calls
    const result = await SubscriptionService.handleSubscriptionLifecycle();
    
    logger.info('Subscription lifecycle job completed', result);
    
    return NextResponse.json({ 
        success: true, 
        ...result 
    });
  } catch (error: any) {
    logger.error('Error in subscription lifecycle job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
