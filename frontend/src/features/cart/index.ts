/**
 * Cart Feature — Public API
 *
 * الواجهة العامة لنطاق السلة. استورد دائماً من هنا.
 */

export type {
  Cart,
  CartCoupon,
  CartCheckoutResponse,
  CartItem,
  CartSubject,
  CartTotals,
} from "./domain/types";

export {
  CART_GUEST_STORAGE_KEY,
  CART_MAX_ITEMS,
  CART_UPDATED_EVENT,
  calcCartTotals,
  clearGuestCart,
  emitCartUpdated,
  formatCartPrice,
  getCartItemKey,
  isInCart,
  normalizeCartItems,
  readGuestCart,
  writeGuestCart,
} from "./domain/cart-logic";

export {
  addCartItem,
  checkoutCart,
  clearCartItems,
  fetchCart,
  removeCartItem,
} from "./api/cart-gateway";

export {
  addGuestCartItem,
  cartKeys,
  useAddToCart,
  useAddToCartMutation,
  useCart,
  useCartCount,
  useCheckoutCartMutation,
  useRemoveFromCartMutation,
} from "./hooks/use-cart";
