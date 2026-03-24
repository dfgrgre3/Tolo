import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymob } from '@/lib/paymob';
import { CouponService } from '@/services/coupon-service';
import { ReferralService } from '@/services/referral-service';
import { sendMultiChannelNotification } from '@/services/notification-sender';
import {
  SubscriptionService,
  type BillingCycle,
} from '@/services/subscription-service';
import { getRequestUserId } from '@/lib/request-auth';

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      planId,
      paymentMethod,
      couponCode,
      billingCycle = 'monthly',
    }: {
      planId: string;
      paymentMethod: string;
      couponCode?: string;
      billingCycle?: BillingCycle;
    } = body;

    if (!planId || !['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const basePrice =
      billingCycle === 'yearly' ? Math.round(plan.price * 12 * 0.8) : plan.price;

    let finalPrice = basePrice;
    let couponId: string | null = null;
    let promoDiscountValue = 0;

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon(couponCode, userId, basePrice);
      if (!couponResult.valid || couponResult.finalAmount === undefined) {
        return NextResponse.json({ error: couponResult.message }, { status: 400 });
      }

      finalPrice = couponResult.finalAmount;
      couponId = couponResult.coupon?.id ?? null;
      promoDiscountValue = couponResult.discountAmount ?? 0;
    }

    const referralDiscount = await CouponService.applyReferralBalance(userId, finalPrice);
    const balanceDiscountValue = referralDiscount.discountUsed;
    finalPrice = referralDiscount.finalAmount;

    const activeSub = await SubscriptionService.checkActiveSubscription(userId);
    let prorationDiscountValue = 0;
    let extraCreditToAdd = 0;

    if (activeSub) {
      const prorationResult = await SubscriptionService.handleProration(userId, finalPrice);
      prorationDiscountValue = prorationResult.remainingValue;
      finalPrice = prorationResult.adjustedPrice;
      extraCreditToAdd = prorationResult.creditBalance;
    }

    if (paymentMethod === 'internal_wallet') {
      if (user.balance < finalPrice) {
        return NextResponse.json(
          { error: 'رصيد الحساب غير كافٍ. يرجى شحن الرصيد أولاً.' },
          { status: 400 }
        );
      }

      const { payment } = await SubscriptionService.createPendingSubscriptionPurchase({
        userId: user.id,
        planId: plan.id,
        billingCycle,
        planInterval: plan.interval,
        finalAmount: finalPrice,
        paymentMethod: 'wallet',
        couponId,
        promoDiscount: promoDiscountValue,
        prorationDiscount: prorationDiscountValue,
        balanceUsed: balanceDiscountValue,
        creditAmount: extraCreditToAdd,
        provider: 'INTERNAL',
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: finalPrice } },
      });

      await SubscriptionService.activateSubscriptionPayment(payment.id, {
        paymentData: JSON.stringify({
          source: 'internal_wallet',
          billingCycle,
          couponCode: couponCode ?? null,
        }),
      });

      await ReferralService.processReferralReward(user.id, finalPrice);

      const latestSubscription = await SubscriptionService.checkActiveSubscription(user.id);

      await sendMultiChannelNotification({
        userId: user.id,
        title: 'تم تفعيل الاشتراك من رصيد الحساب',
        message:
          `تم خصم ${finalPrice} ج.م وتفعيل باقة "${plan.nameAr || plan.name}" بنجاح.` +
          (latestSubscription?.endDate
            ? ` الاشتراك متاح حتى ${latestSubscription.endDate.toLocaleDateString('ar-EG')}.`
            : '') +
          (prorationDiscountValue > 0 ? ` تم تطبيق تسوية بقيمة ${prorationDiscountValue} ج.م.` : '') +
          (extraCreditToAdd > 0 ? ` وتمت إضافة ${extraCreditToAdd} ج.م إلى رصيدك.` : ''),
        type: 'success',
        icon: 'paid',
        channels: ['app', 'email'],
        actionUrl: '/dashboard/subscription',
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription activated via wallet balance',
      });
    }

    if (finalPrice <= 0) {
      const { payment } = await SubscriptionService.createPendingSubscriptionPurchase({
        userId: user.id,
        planId: plan.id,
        billingCycle,
        planInterval: plan.interval,
        finalAmount: 0,
        paymentMethod: 'internal',
        couponId,
        promoDiscount: promoDiscountValue,
        prorationDiscount: prorationDiscountValue,
        balanceUsed: balanceDiscountValue,
        creditAmount: extraCreditToAdd,
        provider: 'PRORATION',
      });

      await SubscriptionService.activateSubscriptionPayment(payment.id, {
        paymentData: JSON.stringify({
          source: 'proration',
          billingCycle,
          couponCode: couponCode ?? null,
        }),
      });

      return NextResponse.json({
        success: true,
        message: 'تم تحديث اشتراكك بنجاح، والتكلفة مغطاة بالكامل.',
        finalAmount: 0,
        creditAdded: extraCreditToAdd,
      });
    }

    let integrationId = 0;
    switch (paymentMethod) {
      case 'card':
        integrationId = parseInt(process.env.PAYMOB_INTEGRATION_ID_CARD || '0', 10);
        break;
      case 'fawry':
        integrationId = parseInt(process.env.PAYMOB_INTEGRATION_ID_FAWRY || '0', 10);
        break;
      case 'wallet':
        integrationId = parseInt(process.env.PAYMOB_INTEGRATION_ID_WALLET || '0', 10);
        break;
      default:
        return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    if (!integrationId) {
      return NextResponse.json({ error: 'Payment integration not configured' }, { status: 500 });
    }

    const { payment } = await SubscriptionService.createPendingSubscriptionPurchase({
      userId: user.id,
      planId: plan.id,
      billingCycle,
      planInterval: plan.interval,
      finalAmount: finalPrice,
      paymentMethod,
      couponId,
      promoDiscount: promoDiscountValue,
      prorationDiscount: prorationDiscountValue,
      balanceUsed: balanceDiscountValue,
      creditAmount: extraCreditToAdd,
      provider: 'PAYMOB',
    });

    const authToken = await paymob.authenticate();
    const amountCents = Math.round(finalPrice * 100);
    const paymobOrderId = await paymob.registerOrder(authToken, amountCents, payment.id);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { orderId: paymobOrderId.toString() },
    });

    const paymentKey = await paymob.generatePaymentKey(
      authToken,
      paymobOrderId,
      amountCents,
      integrationId,
      {
        email: user.email,
        firstName: user.name?.split(' ')[0] || 'Customer',
        lastName: user.name?.split(' ')[1] || 'User',
        phone: user.phone || '0123456789',
      }
    );

    return NextResponse.json({
      paymentKey,
      orderId: paymobOrderId,
      iframeId: process.env.PAYMOB_IFRAME_ID,
      finalAmount: finalPrice,
      basePrice,
      discountAmount: promoDiscountValue + prorationDiscountValue + balanceDiscountValue,
      billingCycle,
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
