import { NextResponse } from 'next/server';
import { CouponService } from '@/services/coupon-service';
import { getRequestUserId } from '@/lib/request-auth';
import { logger } from '@/lib/logger';

interface CouponValidateRequest {
  code: string;
  amount: number;
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as CouponValidateRequest;
    const { code, amount } = body;

    if (!code) {
      return NextResponse.json({ error: 'يرجى إدخال كود الخصم' }, { status: 400 });
    }

    const result = await CouponService.validateCoupon(code, userId, amount);

    if (!result.valid) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        couponCode: result.coupon?.code,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
        description: result.coupon?.description,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    logger.error('Coupon Validate Error:', { error: errorMessage });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
