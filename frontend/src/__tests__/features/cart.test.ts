import { describe, expect, it } from "vitest";
import {
  calcCartTotals,
  normalizeCartItems,
  readGuestCart,
  writeGuestCart,
  clearGuestCart,
  isInCart,
  CART_MAX_ITEMS,
  type CartItem,
} from "@/features/cart";

const item = (id: string, price: number): CartItem => ({
  id: `c-${id}`,
  subjectId: id,
  subject: { id, name: `course ${id}`, price },
});

describe("normalizeCartItems", () => {
  it("يقبل كل أشكال الأغلفة", () => {
    expect(normalizeCartItems({ items: [item("a", 10)] })).toHaveLength(1);
    expect(normalizeCartItems([item("a", 10)])).toHaveLength(1);
    expect(normalizeCartItems({ data: { items: [item("a", 10)] } })).toHaveLength(1);
    expect(normalizeCartItems({ data: [item("a", 10)] })).toHaveLength(1);
    expect(normalizeCartItems(null)).toEqual([]);
    expect(normalizeCartItems({})).toEqual([]);
  });
});

describe("calcCartTotals", () => {
  it("يحسب الإجمالي بدون كوبون", () => {
    const t = calcCartTotals([item("a", 100), item("b", 200)], null);
    expect(t).toMatchObject({ rawTotal: 300, discountAmount: 0, finalTotal: 300 });
  });

  it("يطبق خصم النسبة", () => {
    const t = calcCartTotals([item("a", 200)], {
      code: "X",
      discountType: "PERCENTAGE",
      discount: 25,
    });
    expect(t.discountAmount).toBe(50);
    expect(t.finalTotal).toBe(150);
  });

  it("يطبق الخصم الثابت ويقيّده بالإجمالي", () => {
    const t = calcCartTotals([item("a", 100)], {
      code: "X",
      discountType: "FIXED",
      discount: 1000,
    });
    expect(t.finalTotal).toBe(0);
    expect(t.discountAmount).toBe(100);
  });
});

describe("isInCart", () => {
  it("يكشف وجود العنصر", () => {
    expect(isInCart([item("a", 10)], "a")).toBe(true);
    expect(isInCart([item("a", 10)], "b")).toBe(false);
  });
});

describe("guest cart storage", () => {
  it("يكتب ويقرأ ويمسح سلة الضيف", () => {
    writeGuestCart(["a", "b", "a"]);
    expect(readGuestCart()).toEqual(["a", "b"]);
    clearGuestCart();
    expect(readGuestCart()).toEqual([]);
  });

  it("يقيّد الحد الأقصى", () => {
    const many = Array.from({ length: CART_MAX_ITEMS + 10 }, (_, i) => `s-${i}`);
    writeGuestCart(many);
    expect(readGuestCart().length).toBe(CART_MAX_ITEMS);
    clearGuestCart();
  });
});
