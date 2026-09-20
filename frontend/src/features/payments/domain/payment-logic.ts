/**
 * Payments Domain — Business Logic
 *
 * Pure functions — zero side effects, zero API calls.
 * يمكن اختبارها unit بدون mock.
 */

import type { PaymentMethod, PaymentInitResponse, PaymentAction } from "./types";
import { isPaymentRedirectUrl } from "@/lib/security/redirect-policy";

// ─── بوابة Paymob ─────────────────────────────────────────────────

const PAYMOB_IFRAME_BASE = "https://egypt.paymob.com/api/acceptance/iframes";
const PAYMOB_WALLET_CHECKOUT =
  "https://egypt.paymob.com/api/acceptance/wallets/v1/checkout";

export function buildCardIframeUrl(
  iframeId: string | number,
  paymentKey: string,
): string {
  return `${PAYMOB_IFRAME_BASE}/${iframeId}?payment_token=${paymentKey}`;
}

export function buildWalletCheckoutUrl(paymentKey: string): string {
  return `${PAYMOB_WALLET_CHECKOUT}?payment_token=${paymentKey}`;
}

// ─── استخراج كود فوري ─────────────────────────────────────────────

export function getFawryCode(data: PaymentInitResponse): string | null {
  return data.fawryCode || data.billReference || null;
}

/**
 * يحوّل استجابة تهيئة الدفع إلى إجراء واحد واضح بترتيب أولويات ثابت.
 * redirect الصريح أولاً (بعد التحقق من allowlist المضيف)، ثم معالجة كل طريقة دفع.
 * روابط redirect خارج allowlist تُتجاهل وتسقط لبقية المنطق بدل التنقل إليها.
 */
export function resolvePaymentAction(
  paymentMethod: PaymentMethod,
  data: PaymentInitResponse,
): PaymentAction {
  if (data.success) return { kind: "success" };
  if (data.redirectUrl && isPaymentRedirectUrl(data.redirectUrl)) {
    return { kind: "redirect", url: data.redirectUrl };
  }

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

// ─── تنسيق العملة ─────────────────────────────────────────────────

export function formatEGP(amount: number): string {
  return `${amount.toLocaleString("ar-EG")} ج.م`;
}
