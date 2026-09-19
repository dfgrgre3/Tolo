"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryProfiles } from "@/lib/query/query-profiles";
import { useAuth } from "@/hooks/use-auth";
import * as paymentsApi from "../api/payments-gateway";
import type {
  PaymentMethod,
  CreatePaymentRequest,
} from "../domain/types";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const paymentKeys = {
  wallet: () => ["payments", "wallet"] as const,
  walletTransactions: () => ["payments", "wallet", "transactions"] as const,
  plans: () => ["payments", "subscription-plans"] as const,
  addons: () => ["payments", "subscription-addons"] as const,
  currentSubscription: () => ["payments", "current-subscription"] as const,
  history: () => ["payments", "history"] as const,
};

// ─── Hook: المحفظة ────────────────────────────────────────────────

export function useWalletBalance() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.wallet(),
    queryFn: paymentsApi.fetchWalletBalance,
    enabled: isAuthenticated,
    ...queryProfiles.financial,
  });
}

export function useWalletTransactions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.walletTransactions(),
    queryFn: paymentsApi.fetchWalletTransactions,
    enabled: isAuthenticated,
    ...queryProfiles.financial,
  });
}

// ─── Hook: الاشتراكات ─────────────────────────────────────────────

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: paymentKeys.plans(),
    queryFn: paymentsApi.fetchSubscriptionPlans,
    ...queryProfiles.static,
  });
}

export function useSubscriptionAddons() {
  return useQuery({
    queryKey: paymentKeys.addons(),
    queryFn: paymentsApi.fetchSubscriptionAddons,
    ...queryProfiles.static,
  });
}

export function useCurrentSubscription() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.currentSubscription(),
    queryFn: paymentsApi.fetchCurrentSubscription,
    enabled: isAuthenticated,
    ...queryProfiles.dashboard,
  });
}

// ─── Hook: تاريخ المدفوعات ────────────────────────────────────────

export function usePaymentHistory() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.history(),
    queryFn: paymentsApi.fetchPaymentHistory,
    enabled: isAuthenticated,
    ...queryProfiles.financial,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useTopupWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method: PaymentMethod }) =>
      paymentsApi.topupWallet(amount, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.walletTransactions() });
    },
  });
}

export function useCheckoutSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      method,
      couponCode,
    }: {
      planId: string;
      method: PaymentMethod;
      couponCode?: string;
    }) => paymentsApi.checkoutSubscription(planId, method, couponCode),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.currentSubscription(),
      });
    },
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.currentSubscription(),
      });
    },
  });
}

export function useCreatePaymentMutation() {
  return useMutation({
    mutationFn: (request: CreatePaymentRequest) =>
      paymentsApi.createPayment(request),
  });
}

export function useValidateCouponMutation() {
  return useMutation({
    mutationFn: ({ code, amount }: { code: string; amount?: number }) =>
      paymentsApi.validateCoupon(code, amount),
  });
}
