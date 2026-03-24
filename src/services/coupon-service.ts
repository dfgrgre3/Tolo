import { prisma } from '@/lib/db';
import { DiscountType } from '@prisma/client';

export class CouponService {
  /**
   * Validate a coupon code and return its details if valid
   */
  static async validateCoupon(code: string, userId: string, orderAmount: number) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, message: 'كود الخصم غير موجود' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'كود الخصم غير مفعّل حالياً' };
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return { valid: false, message: 'كود الخصم منتهي الصلاحية' };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, message: 'كود الخصم وصل للحد الأقصى للاستخدام' };
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return { valid: false, message: `هذا الكود يتطلب حد أدنى للشراء بقيمة ${coupon.minOrderAmount} ج.م` };
    }

    // Optional: Check if the user has already used this coupon (one use per user)
    const userPaymentWithCoupon = await prisma.payment.findFirst({
        where: {
            userId,
            couponId: coupon.id,
            status: 'SUCCESS'
        }
    });

    if (userPaymentWithCoupon) {
        return { valid: false, message: 'لقد استخدمت هذا الكود من قبل' };
    }

    // --- Advanced Targeting Checks ---
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { valid: false, message: 'المستخدم غير موجود' };

    // 1. Specific User Targeting
    if (coupon.userTargetId && coupon.userTargetId !== userId) {
        return { valid: false, message: 'هذا الكود مخصص لمستخدم آخر' };
    }

    // 2. School/Region Targeting
    if (coupon.schoolTarget && user.school !== coupon.schoolTarget) {
        return { valid: false, message: `هذا الكود مخصص لطلاب مدرسة ${coupon.schoolTarget}` };
    }

    if (coupon.regionTarget && user.country !== coupon.regionTarget) {
        return { valid: false, message: `هذا الكود مخصص لمنطقة ${coupon.regionTarget}` };
    }

    // 3. Win-back Logic
    if (coupon.isWinBack && coupon.minInactiveDays) {
        const lastActivity = user.lastLogin || user.createdAt;
        const daysInactive = (new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysInactive < coupon.minInactiveDays) {
            return { valid: false, message: `هذا الكود مخصص للطلاب العائدين بعد فترة انقطاع (${coupon.minInactiveDays} يوم)` };
        }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);

    return {
      valid: true,
      coupon,
      discountAmount,
      finalAmount: orderAmount - discountAmount,
    };
  }

  /**
   * Increment the used count of a coupon
   */
  static async incrementUsedCount(couponId: string) {
    return await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  /**
   * Apply referral balance as an automatic discount (Affiliate Integration)
   */
  static async applyReferralBalance(userId: string, currentAmount: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true }
    });

    if (!user || user.balance <= 0) return { discountUsed: 0, finalAmount: currentAmount };

    const discountToApply = Math.min(user.balance, currentAmount);
    
    return {
        discountUsed: discountToApply,
        finalAmount: currentAmount - discountToApply,
        remainingBalance: user.balance - discountToApply
    };
  }
}
