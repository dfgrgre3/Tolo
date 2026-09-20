import { describe, expect, it } from "vitest";
import { isValidEgyptMobileE164, normalizePhoneToE164 } from "@/lib/phone";

describe("normalizePhoneToE164", () => {
  it("converts Egyptian local numbers to E.164", () => {
    expect(normalizePhoneToE164("01012345678")).toBe("+201012345678");
    expect(normalizePhoneToE164("01512345678")).toBe("+201512345678");
  });

  it("keeps valid E.164 input as-is", () => {
    expect(normalizePhoneToE164("+201012345678")).toBe("+201012345678");
  });

  it("handles 00 prefix, spaces, dashes and Arabic-Indic digits", () => {
    expect(normalizePhoneToE164("00201012345678")).toBe("+201012345678");
    expect(normalizePhoneToE164("010 1234 5678")).toBe("+201012345678");
    expect(normalizePhoneToE164("010-1234-5678")).toBe("+201012345678");
    expect(normalizePhoneToE164("٠١٠١٢٣٤٥٦٧٨")).toBe("+201012345678");
  });

  it("rejects invalid input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("12345")).toBeNull();
    expect(normalizePhoneToE164("abcdefghij")).toBeNull();
    expect(normalizePhoneToE164("+")).toBeNull();
  });
});

describe("isValidEgyptMobileE164", () => {
  it("accepts Egyptian mobile prefixes only", () => {
    expect(isValidEgyptMobileE164("+201012345678")).toBe(true);
    expect(isValidEgyptMobileE164("+201112345678")).toBe(true);
    expect(isValidEgyptMobileE164("+201212345678")).toBe(true);
    expect(isValidEgyptMobileE164("+201512345678")).toBe(true);
    expect(isValidEgyptMobileE164("+20212345678")).toBe(false);
    expect(isValidEgyptMobileE164("01012345678")).toBe(false);
  });
});
