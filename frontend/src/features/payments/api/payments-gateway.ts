/**
 * Payments API Gateway
 *
 * المالك الوحيد لاستدعاءات المدفوعات، المحفظة، الاشتراكات، الكوبونات.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type {
  PaymentMethod,
  PaymentInitResponse,
  PaymentHistoryResponse,
  WalletBalance,
  WalletTransaction,
  SubscriptionPlan,
  SubscriptionAddon,
  CurrentSubscription,
  SubscriptionCheckoutResponse,
  CouponResult,
  CreatePaymentRequest,
} from "../domain/types";

// ─── المحفظة (Wallet) ─────────────────────────────────────────────

export async function fetchWalletBalance(): Promise<WalletBalance> {
  return apiClient.get<WalletBalance>(apiRoutes.billing.wallet);
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  const data = await apiClient.get<
    WalletTransaction[] | { transactions: WalletTransaction[] }
  >(apiRoutes.billing.transactions);
  return Array.isArray(data) ? data : data.transactions ?? [];
}

export async function topupWallet(
  amount: number,
  method: PaymentMethod,
): Promise<PaymentInitResponse> {
  return apiClient.post<PaymentInitResponse>(apiRoutes.billing.topup, {
    amount,
    method,
    paymentMethod: method,
  });
}

// ─── الاشتراكات (Subscriptions) ───────────────────────────────────

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiClient.get<
    SubscriptionPlan[] | { plans: SubscriptionPlan[] }
  >(apiRoutes.subscriptions.plans);
  return Array.isArray(data) ? data : data.plans ?? [];
}

export async function fetchSubscriptionAddons(): Promise<SubscriptionAddon[]> {
  const data = await apiClient.get<
    SubscriptionAddon[] | { addons: SubscriptionAddon[] }
  >(apiRoutes.subscriptions.addons);
  return Array.isArray(data) ? data : data.addons ?? [];
}

export async function fetchCurrentSubscription(): Promise<CurrentSubscription | null> {
  try {
    return await apiClient.get<CurrentSubscription>(
      apiRoutes.subscriptions.current,
    );
  } catch {
    return null;
  }
}

export async function checkoutSubscription(
  planId: string,
  method: PaymentMethod,
  couponCode?: string,
): Promise<SubscriptionCheckoutResponse> {
  return apiClient.post<SubscriptionCheckoutResponse>(
    apiRoutes.subscriptions.checkout,
    { planId, method, paymentMethod: method, couponCode },
  );
}

export async function cancelSubscription(): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(apiRoutes.subscriptions.cancel, {});
}

export async function renewSubscription(
  method: PaymentMethod,
): Promise<PaymentInitResponse> {
  return apiClient.post<PaymentInitResponse>(apiRoutes.subscriptions.renew, {
    method,
    paymentMethod: method,
  });
}

// ─── المدفوعات العامة (Payments) ─────────────────────────────────

export async function createPayment(
  request: CreatePaymentRequest,
): Promise<PaymentInitResponse> {
  return apiClient.post<PaymentInitResponse>(apiRoutes.payments.create, {
    ...request,
    paymentMethod: request.method,
  });
}

export async function fetchPaymentHistory(): Promise<PaymentHistoryResponse> {
  return apiClient.get<PaymentHistoryResponse>(apiRoutes.payments.history);
}

export async function fetchPaymentByOrder(
  orderId: string,
): Promise<PaymentInitResponse> {
  return apiClient.get<PaymentInitResponse>(
    apiRoutes.payments.byOrder(orderId),
  );
}

// ─── مرايا النقل الخام (حد ترحيل الواجهات F-018) ─────────────────────
// Transport-only 1:1 mirrors of pre-existing UI call sites. Same route,
// method and payload; raw payload returned so UI envelope parsing stays
// untouched. Zero behavior change by construction.
type RawPayload = Record<string, unknown>;

export function fetchWalletSummaryRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.billing.wallet);
}

export function topupWalletRaw<T>(amount: number, method: PaymentMethod): Promise<T> {
  return apiClient.post<T>(apiRoutes.billing.topup, {
    amount,
    method,
    paymentMethod: method,
  });
}

export function fetchSubscriptionPlansRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.subscriptions.plans);
}

export function fetchCurrentSubscriptionRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.subscriptions.current);
}

export function fetchBillingSummaryRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.users.billingSummary);
}

export function checkoutSubscriptionRaw<T>(payload: RawPayload): Promise<T> {
  return apiClient.post<T>(apiRoutes.subscriptions.checkout, payload);
}

export function renewSubscriptionRaw(): Promise<unknown> {
  return apiClient.post(apiRoutes.subscriptions.renew, {});
}

export function fetchSubscriptionAddonsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.subscriptions.addons);
}

export function purchaseAddonRaw(addonId: string): Promise<unknown> {
  return apiClient.post(apiRoutes.subscriptions.addons, { addonId });
}

export function fetchPaymentHistoryRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.payments.history);
}

export function fetchPaymentByOrderRaw<T>(orderId: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.payments.byOrder(orderId));
}

export function fetchReferralStatsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.users.referrals);
}

// ─── الكوبونات (Coupons) ──────────────────────────────────────────

/**
 * تحقق موحد من الكوبون.
 * يقبل شكلي الاستجابة (السلة والاشتراكات) ويطبّعهما.
 */
export async function validateCoupon(
  code: string,
  amount?: number,
): Promise<CouponResult> {
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
