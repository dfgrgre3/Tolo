/**
 * وحدة الدفع والاشتراكات المركزية — المصدر الوحيد للحقيقة في الفرونت.
 *
 * توحّد:
 * - طرق الدفع المدعومة (`PaymentMethod`) عبر كل التدفقات (اشتراكات/سلة/دورة).
 * - روابط بوابة Paymob (iframe البطاقات + محافظ الموبايل) — دومين واحد.
 * - شكل استجابة تهيئة الدفع (`PaymentInitResponse`) ومعالجتها.
 * - التحقق الموحد من الكوبونات (عقدا السلة والاشتراكات المختلفان).
 * - تنسيق العملة (جنيه مصري).
 *
 * القاعدة: أي شاشة دفع جديدة يجب أن تستخدم هذه الوحدة بدل القيم المكتوبة يدوياً.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

// ─── طرق الدفع ────────────────────────────────────────────────────

export type PaymentMethod = "card" | "wallet" | "fawry" | "internal_wallet";

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; sub: string }> = {
  card: { label: "بطاقة بنكية", sub: "Visa / Mastercard / Meeza" },
  wallet: { label: "محفظة موبايل", sub: "Vodafone Cash والمحافظ المدعومة" },
  fawry: { label: "فوري", sub: "كود دفع نقدي عبر منافذ فوري" },
  internal_wallet: { label: "رصيد المنصة", sub: "الدفع من محفظتك داخل المنصة" },
};

export const PAYMENT_METHOD_IDS: PaymentMethod[] = ["internal_wallet", "card", "wallet", "fawry"];

// ─── بوابة Paymob ─────────────────────────────────────────────────

const PAYMOB_IFRAME_BASE = "https://egypt.paymob.com/api/acceptance/iframes";
const PAYMOB_WALLET_CHECKOUT = "https://egypt.paymob.com/api/acceptance/wallets/v1/checkout";

export function buildCardIframeUrl(iframeId: string | number, paymentKey: string): string {
  return `${PAYMOB_IFRAME_BASE}/${iframeId}?payment_token=${paymentKey}`;
}

export function buildWalletCheckoutUrl(paymentKey: string): string {
  return `${PAYMOB_WALLET_CHECKOUT}?payment_token=${paymentKey}`;
}

// ─── استجابة تهيئة الدفع ──────────────────────────────────────────

export interface PaymentInitResponse {
  success?: boolean;
  iframeId?: string | number;
  paymentKey?: string;
  redirectUrl?: string;
  fawryCode?: string;
  billReference?: string;
  error?: string;
}

export type PaymentAction =
  | { kind: "success" }
  | { kind: "redirect"; url: string }
  | { kind: "iframe"; url: string }
  | { kind: "wallet"; url: string }
  | { kind: "fawry-code"; code: string }
  | { kind: "pending" };

export function getFawryCode(data: PaymentInitResponse): string | null {
  return data.fawryCode || data.billReference || null;
}

/**
 * يحوّل استجابة تهيئة الدفع إلى إجراء واحد واضح، بترتيب أولويات ثابت:
 * redirect الصريح أولاً، ثم معالجة كل طريقة دفع.
 */
export function resolvePaymentAction(
  paymentMethod: PaymentMethod,
  data: PaymentInitResponse,
): PaymentAction {
  if (data.success) return { kind: "success" };
  if (data.redirectUrl) return { kind: "redirect", url: data.redirectUrl };

  if (paymentMethod === "fawry") {
    const code = getFawryCode(data);
    if (code) return { kind: "fawry-code", code };
    if (data.paymentKey && data.iframeId) {
      return { kind: "iframe", url: buildCardIframeUrl(data.iframeId, data.paymentKey) };
    }
    return { kind: "pending" };
  }

  if (paymentMethod === "wallet" && data.paymentKey && !data.iframeId) {
    return { kind: "wallet", url: buildWalletCheckoutUrl(data.paymentKey) };
  }

  if (data.paymentKey && data.iframeId) {
    return { kind: "iframe", url: buildCardIframeUrl(data.iframeId, data.paymentKey) };
  }

  return { kind: "pending" };
}

// ─── الكوبونات (عقد موحد) ─────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  /** شكل عقد السلة: نسبة أو قيمة */
  discountType?: string;
  discount?: number;
  /** شكل عقد الاشتراكات: مبالغ نهائية */
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
  description?: string;
}

/**
 * تحقق موحد من الكوبون عبر `apiRoutes.coupons.validate`.
 * يقبل شكلي الاستجابة (السلة والاشتراكات) ويطبّعهما في `CouponResult`.
 */
export async function validateCoupon(code: string, amount?: number): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  const payload =
    amount !== undefined ? { code: normalized, amount } : { code: normalized };
  const raw = await apiClient.post<Record<string, unknown>>(
    apiRoutes.coupons.validate,
    payload,
  );

  const valid =
    typeof raw.valid === "boolean"
      ? raw.valid
      : typeof raw.success === "boolean"
        ? raw.success
        : raw.discountAmount !== undefined || raw.finalAmount !== undefined;

  return {
    valid,
    discountType: typeof raw.discountType === "string" ? raw.discountType : undefined,
    discount: typeof raw.discount === "number" ? raw.discount : undefined,
    discountAmount:
      typeof raw.discountAmount === "number" ? raw.discountAmount : undefined,
    finalAmount: typeof raw.finalAmount === "number" ? raw.finalAmount : undefined,
    message:
      typeof raw.message === "string"
        ? raw.message
        : typeof raw.description === "string"
          ? raw.description
          : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
  };
}

// ─── العملة ───────────────────────────────────────────────────────

export function formatEGP(amount: number): string {
  return `${amount.toLocaleString("ar-EG")} ج.م`;
}
