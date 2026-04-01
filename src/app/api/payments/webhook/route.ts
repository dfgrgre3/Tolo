import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymob } from '@/lib/paymob';
import { ReferralService } from '@/services/referral-service';
import { NotificationQueueService } from '@/services/notification-queue-service';
import { sendMultiChannelNotification } from '@/services/notification-sender';
import { SubscriptionService } from '@/services/subscription-service';

async function enqueueNotification(
  paymentId: string,
  status: 'success' | 'failed',
  suffix: string,
  payload: Parameters<typeof sendMultiChannelNotification>[0]
) {
  const jobId = `${paymentId}-${suffix}-${status}`;

  try {
    await NotificationQueueService.enqueue(
      {
        ...payload,
        idempotencyKey: jobId,
      },
      { jobId }
    );
  } catch (queueError) {
    console.error('Notification queue enqueue failed, falling back to sync send:', queueError);
    await sendMultiChannelNotification(payload);
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { searchParams } = new URL(req.url);
    const receivedHmac = body?.hmac || searchParams.get('hmac');

    if (process.env.NODE_ENV === 'production' && !receivedHmac) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    if (receivedHmac && !paymob.verifyHmac(body, receivedHmac)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const data = body?.obj ?? {};
    const merchantOrderId = data?.order?.merchant_order_id ?? data?.merchant_order_id;

    if (!merchantOrderId) {
      return NextResponse.json({ message: 'Merchant Order ID not found' }, { status: 200 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: merchantOrderId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.provider !== 'PAYMOB') {
      return NextResponse.json({ error: 'Payment provider mismatch' }, { status: 409 });
    }

    const reportedOrderId = data?.order?.id?.toString?.() ?? null;
    if (payment.orderId && reportedOrderId && payment.orderId !== reportedOrderId) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 409 });
    }

    const amountCents = Number(data?.amount_cents);
    const expectedAmountCents = Math.round(payment.amount * 100);
    if (Number.isFinite(amountCents) && amountCents !== expectedAmountCents) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 409 });
    }

    const isSuccess = data?.success === true;
    const statusKey = isSuccess ? 'success' : 'failed';

    if (isSuccess) {
      await SubscriptionService.activateSubscriptionPayment(payment.id, {
        transactionId: data?.id?.toString?.() ?? null,
        orderId: reportedOrderId ?? payment.orderId ?? null,
        paymentData: JSON.stringify(data),
      });

      await ReferralService.processReferralReward(payment.userId, payment.amount);
    } else {
      await SubscriptionService.failSubscriptionPayment(payment.id, {
        transactionId: data?.id?.toString?.() ?? null,
        paymentData: JSON.stringify(data),
        errorMessage: data?.txn_response_code?.toString?.() ?? 'PAYMENT_FAILED',
      });

      await enqueueNotification(payment.id, statusKey, 'payment-warning', {
        userId: payment.userId,
        title: 'ظ…ط´ظƒظ„ط© ظپظٹ ط³ط¯ط§ط¯ ط§ظ„ط§ط´طھط±ط§ظƒ',
        message:
          'ظپط´ظ„طھ ط¹ظ…ظ„ظٹط© ط§ظ„ط¯ظپط¹ ط§ظ„ط®ط§طµط© ط¨ط§ط´طھط±ط§ظƒظƒ. ظٹظ…ظƒظ†ظƒ ط¥ط¹ط§ط¯ط© ط§ظ„ظ…ط­ط§ظˆظ„ط© ط£ظˆ ط§ط®طھظٹط§ط± ظˆط³ظٹظ„ط© ط¯ظپط¹ ظ…ط®طھظ„ظپط©.',
        type: 'warning',
        icon: 'warning',
        channels: ['app', 'email'],
        actionUrl: '/billing',
      });
    }

    await enqueueNotification(payment.id, statusKey, 'payment-status', {
      userId: payment.userId,
      title: isSuccess ? 'طھظ… طھط£ظƒظٹط¯ ط§ط´طھط±ط§ظƒظƒ ط¨ظ†ط¬ط§ط­' : 'ظپط´ظ„طھ ط¹ظ…ظ„ظٹط© ط§ظ„ط¯ظپط¹',
      message: isSuccess
        ? `طھظ… طھظپط¹ظٹظ„ ط§ط´طھط±ط§ظƒظƒ ط¨ظ‚ظٹظ…ط© ${payment.amount} ط¬.ظ… ظˆظٹظ…ظƒظ†ظƒ ط§ظ„ط¢ظ† ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط§ظ„ظ…ط²ط§ظٹط§ ط§ظ„ظ…ط¯ظپظˆط¹ط©.`
        : `طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط¯ظپط¹ ط¨ظ‚ظٹظ…ط© ${payment.amount} ط¬.ظ…. ط±ط§ط¬ط¹ ظˆط³ظٹظ„ط© ط§ظ„ط¯ظپط¹ ط£ظˆ ط£ط¹ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط©.`,
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
