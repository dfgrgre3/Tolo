/**
 * @deprecated
 * هذا الملف أصبح facade للتوافق الرجعي فقط.
 * الاستخدام الصحيح: استورد مباشرة من `@/features/payments`
 *
 * سيُحذف هذا الملف بعد اكتمال هجرة جميع استدعاءاته.
 */
export {
  // Types
  PAYMENT_METHOD_META,
  PAYMENT_METHOD_IDS,
  // Business logic
  buildCardIframeUrl,
  buildWalletCheckoutUrl,
  getFawryCode,
  resolvePaymentAction,
  formatEGP,
  // API
  validateCoupon,
} from "@/features/payments";

export type {
  PaymentMethod,
  PaymentInitResponse,
  PaymentAction,
  CouponResult,
} from "@/features/payments";
