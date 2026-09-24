/**
 * Cart Domain — Pure business logic (zero side effects, zero API calls).
 * قابلة للاختبار unit بدون mock.
 */

import type { CartCoupon, CartItem, CartTotals } from "./types";

export const CART_GUEST_STORAGE_KEY = "tolo-cart-guest-v1";
export const CART_MAX_ITEMS = 50;
export const CART_UPDATED_EVENT = "tolo:cart-updated";

export function normalizeCartItems(input: unknown): CartItem[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as CartItem[];
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as CartItem[];
    const data = obj.data;
    if (Array.isArray(data)) return data as CartItem[];
    if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).items)) {
      return (data as { items: CartItem[] }).items;
    }
  }
  return [];
}

export function getCartItemKey(item: Pick<CartItem, "id" | "subjectId">): string {
  return item.subjectId || item.id;
}

export function isInCart(items: CartItem[], subjectId: string): boolean {
  return items.some((i) => getCartItemKey(i) === subjectId);
}

export function calcCartTotals(
  items: CartItem[],
  coupon: CartCoupon | null,
  currency = "ج.م",
): CartTotals {
  const rawTotal = items.reduce((sum, item) => sum + (Number(item.subject?.price) || 0), 0);
  let discountAmount = 0;
  if (coupon && rawTotal > 0) {
    discountAmount =
      coupon.discountType === "PERCENTAGE"
        ? rawTotal * (Number(coupon.discount) / 100)
        : Number(coupon.discount) || 0;
    discountAmount = Math.min(Math.max(0, discountAmount), rawTotal);
  }
  return {
    rawTotal,
    discountAmount,
    finalTotal: Math.max(0, rawTotal - discountAmount),
    currency,
  };
}

export function formatCartPrice(amount: number): string {
  return `${Number(amount || 0).toLocaleString("ar-EG")} ج.م`;
}

export function emitCartUpdated(count: number): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<number>(CART_UPDATED_EVENT, { detail: count }));
  } catch {
    /* non-critical */
  }
}

export function readGuestCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, CART_MAX_ITEMS);
  } catch {
    return [];
  }
}

export function writeGuestCart(subjectIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CART_GUEST_STORAGE_KEY,
      JSON.stringify([...new Set(subjectIds)].slice(0, CART_MAX_ITEMS)),
    );
  } catch {
    /* quota / private mode — guest cart simply won't persist */
  }
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_GUEST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
