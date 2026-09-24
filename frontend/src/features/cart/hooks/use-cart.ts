"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/api-client";
import { queryProfiles } from "@/lib/query/query-profiles";
import {
  addCartItem,
  checkoutCart,
  fetchCart,
  removeCartItem,
} from "../api/cart-gateway";
import {
  CART_UPDATED_EVENT,
  clearGuestCart,
  emitCartUpdated,
  readGuestCart,
  writeGuestCart,
} from "../domain/cart-logic";
import type { CartItem } from "../domain/types";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const cartKeys = {
  all: () => ["cart"] as const,
  detail: () => ["cart", "detail"] as const,
  count: () => ["cart", "count"] as const,
};

// ─── Hook: السلة ──────────────────────────────────────────────────

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: cartKeys.detail(),
    queryFn: async (): Promise<CartItem[]> => {
      // دمج سلة الضيف بعد تسجيل الدخول (best-effort، صامت عند الفشل)
      if (isAuthenticated) {
        const guest = readGuestCart();
        if (guest.length > 0) {
          await Promise.allSettled(guest.map((id) => addCartItem(id)));
          clearGuestCart();
        }
      }
      return fetchCart();
    },
    enabled: isAuthenticated,
    ...queryProfiles.financial,
    meta: { persist: false },
  });

  const items = query.data ?? [];
  const count = items.length;

  // بثّ عدد العناصر للهيدر عبر حدث خفيف (لا يعتمد على polling)
  useEffect(() => {
    if (query.isSuccess) emitCartUpdated(count);
  }, [query.isSuccess, count]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
  }, [queryClient]);

  return { ...query, items, count, refresh };
}

// ─── Hook: عدّاد الهيدر (يستمع للحدث + query) ─────────────────────

export function useCartCount() {
  const { user } = useAuth();
  const cart = useCart();

  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUpdate = () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
    };
    window.addEventListener(CART_UPDATED_EVENT, onUpdate as EventListener);
    return () => window.removeEventListener(CART_UPDATED_EVENT, onUpdate as EventListener);
  }, [queryClient]);

  if (!user) return { count: 0, hasItems: false };
  return { count: cart.count, hasItems: cart.count > 0 };
}

// ─── Mutations ────────────────────────────────────────────────────

function handleCartMutationError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.isUnauthorized) {
    toast.error("سجّل الدخول أولاً");
  } else if (error instanceof ApiError && error.status === 409) {
    toast.error(error.message || "هذا الكورس في سلتك بالفعل");
  } else if (error instanceof ApiError) {
    toast.error(error.message || fallback);
  } else {
    toast.error(fallback);
  }
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, string, { previous?: CartItem[] }>({
    mutationFn: async (subjectId: string) => {
      await addCartItem(subjectId);
      return subjectId;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartKeys.detail() });
      const previous = queryClient.getQueryData<CartItem[]>(cartKeys.detail());
      return { previous };
    },
    onError: (error, subjectId) => {
      void subjectId;
      handleCartMutationError(error, "فشلت الإضافة للسلة");
    },
    onSuccess: () => {
      toast.success("تمت الإضافة للسلة");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
    },
  });
}

export function addGuestCartItem(subjectId: string): boolean {
  const current = readGuestCart();
  if (current.includes(subjectId)) return false;
  writeGuestCart([...current, subjectId]);
  emitCartUpdated(current.length + 1);
  return true;
}

/** إضافة موحدة: مسجّل → API، ضيف → localStorage */
export function useAddToCart() {
  const { isAuthenticated } = useAuth();
  const mutation = useAddToCartMutation();
  return {
    ...mutation,
    add: (subjectId: string) => {
      if (isAuthenticated) return mutation.mutate(subjectId);
      const added = addGuestCartItem(subjectId);
      toast.success(added ? "تمت الإضافة للسلة" : "هذا الكورس في سلتك بالفعل");
    },
  };
}

export function useRemoveFromCartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => removeCartItem(subjectId),
    onMutate: async (subjectId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.detail() });
      const previous = queryClient.getQueryData<CartItem[]>(cartKeys.detail());
      if (previous) {
        queryClient.setQueryData<CartItem[]>(
          cartKeys.detail(),
          previous.filter((i) => (i.subjectId || i.id) !== subjectId),
        );
      }
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.detail(), context.previous);
      handleCartMutationError(error, "فشل الحذف");
    },
    onSuccess: () => {
      toast.success("تم الحذف من السلة");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
    },
  });
}

export function useCheckoutCartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentMethod, couponCode }: { paymentMethod: string; couponCode?: string }) =>
      checkoutCart(paymentMethod, couponCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
      emitCartUpdated(0);
    },
  });
}
