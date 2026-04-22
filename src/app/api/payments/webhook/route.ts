import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymob } from '@/lib/paymob';
import { ReferralService } from '@/services/referral-service';
import { NotificationQueueService } from '@/services/notification-queue-service';
import { sendMultiChannelNotification } from '@/services/notification-sender';
import { SubscriptionService } from '@/services/subscription-service';
import { InvoiceService } from '@/services/invoice-service';
import { logger } from '@/lib/logger';

async function enqueueNotification(
paymentId: string,
status: 'success' | 'failed',
suffix: string,
payload: Parameters<typeof sendMultiChannelNotification>[0])
{
  const jobId = `${paymentId}-${suffix}-${status}`;

  try {
    await NotificationQueueService.enqueue(
      {
        ...payload,
        idempotencyKey: jobId
      },
      { jobId }
    );
  } catch (queueError) {
    logger.error('Notification queue enqueue failed, falling back to sync send:', queueError);
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
      include: { user: true }
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

    let target = 'SUBSCRIPTION';
    let subjectId: string | null = null;
    let courseName = 'الدورة';
    if (payment.paymentData) {
      try {
        const pd = JSON.parse(payment.paymentData);
        if (pd.target === 'COURSE') {
          target = 'COURSE';
          subjectId = pd.subjectId;
        }
      } catch (_e) {}
    }

    if (isSuccess) {
      if (target === 'COURSE' && subjectId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            transactionId: data?.id?.toString?.() ?? null
          }
        });

        await prisma.subjectEnrollment.upsert({
          where: {
            userId_subjectId: {
              userId: payment.userId,
              subjectId
            }
          },
          create: {
            userId: payment.userId,
            subjectId,
            targetWeeklyHours: 0
          },
          update: {}
        });

        // Notify for course
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        if (subject) courseName = subject.nameAr || subject.name;

        await enqueueNotification(payment.id, statusKey, 'course-payment-success', {
          userId: payment.userId,
          title: 'تم الانضمام للدورة بنجاح',
          message: `تم تأكيد دفع مبلغ ${payment.amount} ج.م لتسجيلك في دورة "${courseName}". ابدأ التعلم الآن!`,
          type: 'success',
          icon: 'success',
          channels: ['app', 'email'],
          actionUrl: `/courses/${subjectId}`
        });

      } else {
        await SubscriptionService.activateSubscriptionPayment(payment.id, {
          transactionId: data?.id?.toString?.() ?? null,
          orderId: reportedOrderId ?? payment.orderId ?? null,
          paymentData: JSON.stringify(data)
        });

        await enqueueNotification(payment.id, statusKey, 'payment-status', {
          userId: payment.userId,
          title: 'تم تأكيد اشتراكك بنجاح',
          message: `تم تفعيل اشتراكك بقيمة ${payment.amount} ج.م ويمكنك الآن الوصول إلى المزايا المدفوعة.`,
          type: 'success',
          icon: 'success',
          channels: ['app', 'email'],
          actionUrl: '/dashboard/subscription'
        });
      }

      // Auto-generate invoice
      try {
        await InvoiceService.createInvoice(payment.id);
      } catch (invoiceError) {
        logger.error('Failed to auto-generate invoice:', invoiceError);
      }

      await ReferralService.processReferralReward(payment.userId, payment.amount);
    } else {
      if (target === 'COURSE') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            errorMessage: data?.txn_response_code?.toString?.() ?? 'PAYMENT_FAILED',
            transactionId: data?.id?.toString?.() ?? null
          }
        });

        const subject = subjectId ? await prisma.subject.findUnique({ where: { id: subjectId } }) : null;
        if (subject) courseName = subject.nameAr || subject.name;

        await enqueueNotification(payment.id, statusKey, 'course-payment-failed', {
          userId: payment.userId,
          title: 'فشلت عملية الدفع',
          message: `تعذر إتمام الدفع بقيمة ${payment.amount} ج.م لدورة "${courseName}". راجع وسيلة الدفع أو أعد المحاولة.`,
          type: 'error',
          icon: 'error',
          channels: ['app', 'email'],
          actionUrl: subjectId ? `/courses/${subjectId}/checkout` : '/courses'
        });
      } else {
        await SubscriptionService.failSubscriptionPayment(payment.id, {
          transactionId: data?.id?.toString?.() ?? null,
          paymentData: JSON.stringify(data),
          errorMessage: data?.txn_response_code?.toString?.() ?? 'PAYMENT_FAILED'
        });

        await enqueueNotification(payment.id, statusKey, 'payment-warning', {
          userId: payment.userId,
          title: 'مشكلة في سداد الاشتراك',
          message:
          'فشلت عملية الدفع الخاصة باشتراكك. يمكنك إعادة المحاولة أو اختيار وسيلة دفع مختلفة.',
          type: 'warning',
          icon: 'warning',
          channels: ['app', 'email'],
          actionUrl: '/billing'
        });

        await enqueueNotification(payment.id, statusKey, 'payment-status', {
          userId: payment.userId,
          title: 'فشلت عملية الدفع',
          message: `تعذر إتمام الدفع بقيمة ${payment.amount} ج.م. راجع وسيلة الدفع أو أعد المحاولة.`,
          type: 'error',
          icon: 'error',
          channels: ['app', 'email'],
          actionUrl: '/billing'
        });
      }
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error: any) {
    logger.error('Paymob Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const success = searchParams.get('success');
  const merchantOrderId = searchParams.get('merchant_order_id');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let target = 'SUBSCRIPTION';
  let subjectId = null;

  if (merchantOrderId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: merchantOrderId },
        select: { paymentData: true }
      });
      if (payment?.paymentData) {
        const pd = JSON.parse(payment.paymentData);
        if (pd.target === 'COURSE') {
          target = 'COURSE';
          subjectId = pd.subjectId;
        }
      }
    } catch (_e) {}
  }

  if (target === 'COURSE' && subjectId) {
    if (success === 'true') {
      return NextResponse.redirect(`${baseUrl}/courses/${subjectId}?payment_success=true`);
    }
    return NextResponse.redirect(`${baseUrl}/courses/${subjectId}/checkout?payment_error=true`);
  }

  if (success === 'true') {
    return NextResponse.redirect(`${baseUrl}/dashboard/subscription/success?order_id=${merchantOrderId}`);
  }

  return NextResponse.redirect(`${baseUrl}/dashboard/subscription/fail?order_id=${merchantOrderId}`);
}