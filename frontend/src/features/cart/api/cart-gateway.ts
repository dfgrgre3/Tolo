/**
 * Cart API Gateway
 *
 * المالك الوحيد لاستدعاءات السلة. يستخدم apiClient كـ transport خالص
 * ولا يحمل أي منطق UI.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { normalizeCartItems } from "../domain/cart-logic";
import type { CartCheckoutResponse, CartItem } from "../domain/types";

export async function fetchCart(): Promise<CartItem[]> {
  const data = await apiClient.get<unknown>(apiRoutes.cart.get);
  return normalizeCartItems(data);
}

export async function addCartItem(subjectId: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.cart.items, { subjectId });
}

export async function removeCartItem(subjectId: string): Promise<unknown> {
  return apiClient.delete(apiRoutes.cart.item(subjectId));
}

export async function clearCartItems(items: CartItem[]): Promise<void> {
  await Promise.allSettled(items.map((i) => removeCartItem(i.subjectId || i.id)));
}

export async function checkoutCart(
  paymentMethod: string,
  couponCode?: string,
): Promise<CartCheckoutResponse> {
  return apiClient.postJson<CartCheckoutResponse>(apiRoutes.cart.checkout, {
    paymentMethod,
    couponCode: couponCode || undefined,
  });
}
