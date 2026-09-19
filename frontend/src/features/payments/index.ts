/**
 * Payments Feature — Public API
 *
 * الواجهة العامة لنطاق المدفوعات والمحفظة والاشتراكات.
 * استورد دائماً من هنا بدلاً من المسارات الداخلية.
 *
 * Backward compatibility: `@/lib/payments` re-exports from here.
 */

// Domain types
export type {
  PaymentMethod,
  PaymentInitResponse,
  PaymentAction,
  PaymentTransaction,
  PaymentHistoryResponse,
  WalletBalance,
  WalletTransaction,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionAddon,
  CurrentSubscription,
  SubscriptionCheckoutResponse,
  CouponResult,
  CreatePaymentRequest,
} from "./domain/types";

export {
  PAYMENT_METHOD_META,
  PAYMENT_METHOD_IDS,
} from "./domain/types";

// Business logic (pure functions)
export {
  buildCardIframeUrl,
  buildWalletCheckoutUrl,
  getFawryCode,
  resolvePaymentAction,
  formatEGP,
} from "./domain/payment-logic";

// API gateway
export {
  fetchWalletBalance,
  fetchWalletTransactions,
  topupWallet,
  fetchSubscriptionPlans,
  fetchSubscriptionAddons,
  fetchCurrentSubscription,
  checkoutSubscription,
  cancelSubscription,
  renewSubscription,
  createPayment,
  fetchPaymentHistory,
  fetchPaymentByOrder,
  validateCoupon,
} from "./api/payments-gateway";

// Hooks
export {
  paymentKeys,
  useWalletBalance,
  useWalletTransactions,
  useSubscriptionPlans,
  useSubscriptionAddons,
  useCurrentSubscription,
  usePaymentHistory,
  useTopupWalletMutation,
  useCheckoutSubscriptionMutation,
  useCancelSubscriptionMutation,
  useCreatePaymentMutation,
  useValidateCouponMutation,
} from "./hooks/use-payments";
