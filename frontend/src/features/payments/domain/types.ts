/**
 * Payments Domain — نطاق المدفوعات والمحفظة والاشتراكات
 *
 * المالك الوحيد لنماذج: طرق الدفع، بوابات الدفع (Paymob)،
 * استجابات تهيئة الدفع، الاشتراكات، المحفظة، الكوبونات.
 *
 * القاعدة: أي شاشة دفع جديدة يجب أن تستخدم هذا النطاق بدل القيم المكتوبة يدوياً.
 */

// ─── طرق الدفع ────────────────────────────────────────────────────

export type PaymentMethod = "card" | "wallet" | "fawry" | "internal_wallet";

export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  { label: string; sub: string }
> = {
  card: { label: "بطاقة بنكية", sub: "Visa / Mastercard / Meeza" },
  wallet: { label: "محفظة موبايل", sub: "Vodafone Cash والمحافظ المدعومة" },
  fawry: { label: "فوري", sub: "كود دفع نقدي عبر منافذ فوري" },
  internal_wallet: { label: "رصيد المنصة", sub: "الدفع من محفظتك داخل المنصة" },
};

export const PAYMENT_METHOD_IDS: PaymentMethod[] = [
  "internal_wallet",
  "card",
  "wallet",
  "fawry",
];

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

// ─── تاريخ المعاملات ──────────────────────────────────────────────

export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: "pending" | "success" | "failed" | "refunded";
  createdAt: string;
  description?: string;
  orderId?: string;
}

export interface PaymentHistoryResponse {
  transactions: PaymentTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── المحفظة ──────────────────────────────────────────────────────

export interface WalletBalance {
  balance: number;
  currency: string;
  lockedBalance?: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  createdAt: string;
  referenceId?: string;
}

// ─── الاشتراكات ────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "expired"
  | "cancelled"
  | "pending";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration: number; // days
  features: string[];
  isPopular?: boolean;
  discount?: number;
  originalPrice?: number;
}

export interface SubscriptionAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
}

export interface CurrentSubscription {
  id: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew?: boolean;
  price?: number;
  currency?: string;
}

export interface SubscriptionCheckoutResponse {
  success: boolean;
  subscriptionId?: string;
  paymentRequired?: boolean;
  paymentInit?: PaymentInitResponse;
  message?: string;
}

// ─── الكوبونات ────────────────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  discountType?: string;
  discount?: number;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
  description?: string;
}

// ─── إجراء الدفع (Utility Types) ─────────────────────────────────

export interface CreatePaymentRequest {
  amount: number;
  method: PaymentMethod;
  description?: string;
  referenceId?: string;
}
