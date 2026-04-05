import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { paymob } from '@/lib/paymob';
import { CouponService } from '@/services/coupon-service';
import { ReferralService } from '@/services/referral-service';
import { getRequestUserId } from '@/lib/request-auth';
import { SubscriptionService } from '@/services/subscription-service';
import { logger } from '@/lib/logger';
import { EducationalCache } from '@/lib/cache';
import { NotificationQueueService } from '@/services/notification-queue-service';
import { ReferralQueueService } from '@/services/referral-queue-service';
import { RequestDeduplication } from '@/lib/request-dedup';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // ─── IDEMPOTENCY: Prevent double-payment on retry/multi-click ───
    const dedupKey = RequestDeduplication.checkoutKey(userId, id);
    const dedupResult = await RequestDeduplication.acquire(dedupKey);

    if (dedupResult.isDuplicate) {
      logger.warn(`[Checkout] Duplicate request blocked: user=${userId}, course=${id}, status=${dedupResult.existingStatus}`);
      return NextResponse.json({
        error: 'هذا الطلب قيد المعالجة بالفعل. يرجى الانتظار.',
        code: 'DUPLICATE_REQUEST',
      }, { status: 409 });
    }

    const body = await req.json();
    const {
      paymentMethod,
      couponCode,
    }: {
      paymentMethod: string;
      couponCode?: string;
    } = body;

    const course = await EducationalCache.getOrSetCourse(id, () => prisma.subject.findUnique({
      where: { id },
      select: {
        id: true,
        price: true,
        name: true,
        nameAr: true,
      }
    })) as { id: string; price: number; name: string; nameAr: string | null } | null;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Checking if already enrolled
    const enrollment = await prisma.subjectEnrollment.findUnique({
      where: {
        userId_subjectId: {
          userId,
          subjectId: id
        }
      },
      select: { id: true }
    });

    if (enrollment) {
      return NextResponse.json({ error: 'أنت مسجل بالفعل في هذه الدورة' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        wallet: {
          select: { balance: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSub = await SubscriptionService.checkActiveSubscription(userId);
    const basePrice = activeSub ? 0 : (course.price ?? 0);
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

    // Handle internal wallet
    if (paymentMethod === 'internal_wallet') {
      if ((user.wallet?.balance ?? 0) < finalPrice) {
        return NextResponse.json(
          { error: 'رصيد الحساب غير كافٍ. يرجى شحن الرصيد أولاً.' },
          { status: 400 }
        );
      }

      // Create Payment and Enrollment
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create payment tracking record
        await tx.payment.create({
          data: {
            userId: user.id,
            amount: finalPrice,
            provider: 'INTERNAL',
            status: 'SUCCESS',
            paymentMethod: 'wallet',
            couponId,
            promoDiscount: promoDiscountValue,
            balanceUsed: balanceDiscountValue,
            paymentData: JSON.stringify({
              target: 'COURSE',
              subjectId: course.id,
              source: 'internal_wallet',
              couponCode: couponCode ?? null,
            })
          }
        });

        // Deduct balance
        await tx.userWallet.upsert({
          where: { userId: user.id },
          update: { balance: { decrement: finalPrice } },
          create: {
            userId: user.id,
            balance: 0,
          },
        });

        // Enroll user
        await tx.subjectEnrollment.create({
          data: {
            userId: user.id,
            subjectId: course.id,
            targetWeeklyHours: 0
          }
        });
      });

      await ReferralQueueService.enqueue({
        userId: user.id,
        paymentAmount: finalPrice,
        idempotencyKey: `referral_${user.id}_${course.id}_${Date.now()}`
      });

      await NotificationQueueService.enqueue({
        userId: user.id,
        title: 'تم الانضمام للدورة بنجاح',
        message: `تم خصم ${finalPrice} ج.م من رصيدك وتسجيلك في دورة "${course.nameAr || course.name}".`,
        type: 'success',
        icon: 'book',
        channels: ['app', 'email'],
        actionUrl: `/courses/${course.id}`,
      });

      // Mark checkout as completed (idempotency)
      await RequestDeduplication.complete(dedupKey, 'SUCCESS_WALLET');

      return NextResponse.json({
        success: true,
        message: 'Course activated via wallet balance',
      });
    }

    // If completely free
    if (finalPrice <= 0) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.payment.create({
          data: {
            userId: user.id,
            amount: 0,
            provider: 'FREE',
            status: 'SUCCESS',
            paymentMethod: 'internal',
            couponId,
            promoDiscount: promoDiscountValue,
            balanceUsed: balanceDiscountValue,
            paymentData: JSON.stringify({
              target: 'COURSE',
              subjectId: course.id,
              source: 'free',
              couponCode: couponCode ?? null,
            })
          }
        });

        await tx.subjectEnrollment.create({
          data: {
            userId: user.id,
            subjectId: course.id,
            targetWeeklyHours: 0
          }
        });
      });

      // Mark checkout as completed (idempotency)
      await RequestDeduplication.complete(dedupKey, 'SUCCESS_FREE');

      return NextResponse.json({
        success: true,
        message: 'تم تسجيلك في الدورة بنجاح.',
        finalAmount: 0,
      });
    }

    // Paymob integration
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

    // Create pending payment
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: finalPrice,
        status: 'PENDING',
        paymentMethod,
        provider: 'PAYMOB',
        couponId,
        promoDiscount: promoDiscountValue,
        balanceUsed: balanceDiscountValue,
        paymentData: JSON.stringify({
          target: 'COURSE',
          subjectId: course.id,
          couponCode: couponCode ?? null,
        })
      }
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
      discountAmount: promoDiscountValue + balanceDiscountValue,
    });
  } catch (error: unknown) {
    // Release dedup lock on error so the user can retry
    try {
      const retryUserId = await getRequestUserId(req);
      const { id: retryId } = await params;
      if (retryUserId && retryId) {
        await RequestDeduplication.release(RequestDeduplication.checkoutKey(retryUserId, retryId));
      }
    } catch {}

    logger.error('Course Checkout Error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
