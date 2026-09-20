import { describe, expect, it } from "vitest";

import {
  isPaymentRedirectUrl,
  isSocialAuthRedirectUrl,
} from "@/lib/security/redirect-policy";

describe("isSocialAuthRedirectUrl", () => {
  it("يقبل مضيف الموفر الدقيق", () => {
    expect(
      isSocialAuthRedirectUrl(
        "https://accounts.google.com/o/oauth2/auth?client_id=x",
        "google",
      ),
    ).toBe(true);
  });

  it("يرفض مضيف موفر آخر", () => {
    expect(
      isSocialAuthRedirectUrl("https://appleid.apple.com/auth/authorize", "google"),
    ).toBe(false);
  });

  it("يرفض أي مضيف HTTPS عشوائي", () => {
    expect(isSocialAuthRedirectUrl("https://evil.com/callback", "google")).toBe(false);
  });

  it("يرفض http والنسبي وjavascript", () => {
    expect(isSocialAuthRedirectUrl("http://evil.com/callback", "google")).toBe(false);
    expect(isSocialAuthRedirectUrl("//evil.com/callback", "apple")).toBe(false);
    expect(isSocialAuthRedirectUrl("javascript:alert(1)", "google")).toBe(false);
  });
});

describe("isPaymentRedirectUrl", () => {
  it("يقبل حد Paymob", () => {
    expect(isPaymentRedirectUrl("https://egypt.paymob.com/api/acceptance/iframes/1?payment_token=k")).toBe(
      true,
    );
  });

  it("يقبل المسار الداخلي", () => {
    expect(isPaymentRedirectUrl("/billing?tab=upgrade")).toBe(true);
    expect(isPaymentRedirectUrl("//evil.com/x")).toBe(false);
  });

  it("يرفض المضيف العشوائي", () => {
    expect(isPaymentRedirectUrl("https://pay.example/r/1")).toBe(false);
  });
});
