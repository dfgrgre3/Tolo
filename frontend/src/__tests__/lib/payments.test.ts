import { describe, expect, it } from "vitest";

import {
  buildCardIframeUrl,
  buildWalletCheckoutUrl,
  getFawryCode,
  resolvePaymentAction,
} from "@/lib/payments";

describe("resolvePaymentAction", () => {
  it("يفضل رابط التحويل الصريح مهما كانت الطريقة", () => {
    expect(
      resolvePaymentAction("card", {
        redirectUrl: "https://egypt.paymob.com/api/acceptance/iframes/123?payment_token=k",
        paymentKey: "k",
        iframeId: "123",
      }),
    ).toEqual({
      kind: "redirect",
      url: "https://egypt.paymob.com/api/acceptance/iframes/123?payment_token=k",
    });
  });

  it("يرفض رابط تحويل خارج allowlist ويسقط لبقية المنطق", () => {
    expect(
      resolvePaymentAction("card", {
        redirectUrl: "https://pay.example/r/1",
        paymentKey: "k",
        iframeId: "123",
      }),
    ).toEqual({
      kind: "iframe",
      url: buildCardIframeUrl("123", "k"),
    });
  });

  it("يبني رابط iframe البطاقة من الدومين الموحد", () => {
    expect(resolvePaymentAction("card", { paymentKey: "k", iframeId: "123" })).toEqual({
      kind: "iframe",
      url: buildCardIframeUrl("123", "k"),
    });
    expect(buildCardIframeUrl("123", "k")).toContain("egypt.paymob.com");
  });

  it("يحول المحفظة لرابط checkout المحافظ بدون iframe", () => {
    const action = resolvePaymentAction("wallet", { paymentKey: "k" });
    expect(action.kind).toBe("wallet");
    if (action.kind === "wallet") {
      expect(action.url).toBe(buildWalletCheckoutUrl("k"));
    }
  });

  it("يعيد كود فوري عند توفره", () => {
    expect(resolvePaymentAction("fawry", { fawryCode: "ABC123" })).toEqual({
      kind: "fawry-code",
      code: "ABC123",
    });
    expect(resolvePaymentAction("fawry", { billReference: "REF9" })).toEqual({
      kind: "fawry-code",
      code: "REF9",
    });
  });

  it("يعيد success عند نجاح الدفع الداخلي", () => {
    expect(resolvePaymentAction("internal_wallet", { success: true })).toEqual({
      kind: "success",
    });
  });

  it("يعيد pending عند غياب بيانات التحويل", () => {
    expect(resolvePaymentAction("card", {})).toEqual({ kind: "pending" });
  });
});

describe("getFawryCode", () => {
  it("يفضل fawryCode ثم billReference", () => {
    expect(getFawryCode({ fawryCode: "A", billReference: "B" })).toBe("A");
    expect(getFawryCode({ billReference: "B" })).toBe("B");
    expect(getFawryCode({})).toBeNull();
  });
});
