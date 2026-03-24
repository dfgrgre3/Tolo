import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ReferralService } from '@/services/referral-service';
import { sendMultiChannelNotification } from '@/services/notification-sender';
import { SubscriptionService } from '@/services/subscription-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.obj;
    const internalPaymentId = data?.merchant_order_id;

    if (!internalPaymentId) {
      return NextResponse.json({ message: 'Merchant Order ID not found' }, { status: 200 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: internalPaymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const isSuccess = data?.success === true;

    if (isSuccess) {
      await SubscriptionService.activateSubscriptionPayment(payment.id, {
        transactionId: data?.id?.toString?.() ?? null,
        orderId: data?.order?.id?.toString?.() ?? payment.orderId ?? null,
        paymentData: JSON.stringify(data),
      });

      await ReferralService.processReferralReward(payment.userId, payment.amount);
    } else {
      await SubscriptionService.failSubscriptionPayment(payment.id, {
        transactionId: data?.id?.toString?.() ?? null,
        paymentData: JSON.stringify(data),
        errorMessage: data?.txn_response_code?.toString?.() ?? 'PAYMENT_FAILED',
      });

      await sendMultiChannelNotification({
        userId: payment.userId,
        title: 'مشكلة في سداد الاشتراك',
        message:
          'فشلت عملية الدفع الخاصة باشتراكك. يمكنك إعادة المحاولة أو اختيار وسيلة دفع مختلفة.',
        type: 'warning',
        icon: 'warning',
        channels: ['app', 'email'],
        actionUrl: '/billing',
      });
    }

    await sendMultiChannelNotification({
      userId: payment.userId,
      title: isSuccess ? 'تم تأكيد اشتراكك بنجاح' : 'فشلت عملية الدفع',
      message: isSuccess
        ? `تم تفعيل اشتراكك بقيمة ${payment.amount} ج.م ويمكنك الآن الوصول إلى المزايا المدفوعة.`
        : `تعذر إتمام الدفع بقيمة ${payment.amount} ج.م. راجع وسيلة الدفع أو أعد المحاولة.`,
      type: isSuccess ? 'success' : 'error',
      icon: isSuccess ? 'success' : 'error',
      channels: ['app', 'email'],
      actionUrl: isSuccess ? '/dashboard/subscription' : '/billing',
    });

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error: any) {
    console.error('Paymob Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const success = searchParams.get('success');
  const merchantOrderId = searchParams.get('merchant_order_id');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  if (success === 'true') {
    return NextResponse.redirect(`${baseUrl}/dashboard/subscription/success?order_id=${merchantOrderId}`);
  }

  return NextResponse.redirect(`${baseUrl}/dashboard/subscription/fail?order_id=${merchantOrderId}`);
}
