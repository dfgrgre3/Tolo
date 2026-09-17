import { describe, it, expect } from "vitest";
import {
  getPasswordPolicyError,
  getPasswordRequirements,
  getPasswordStrength,
  isPasswordPolicyValid,
  PASSWORD_MAX_LENGTH,
} from "@/lib/auth/password-policy";

describe("password-policy", () => {
  describe("getPasswordRequirements", () => {
    it("exposes the same set of requirements the validator enforces", () => {
      const reqs = getPasswordRequirements("Abcdefg1!");
      expect(reqs.map((r) => r.id)).toEqual([
        "length", "uppercase", "lowercase", "digit", "special", "notCommon",
      ]);
      expect(reqs.every((r) => r.satisfied)).toBe(true);
    });

    it("marks only the satisfied subset", () => {
      const byId = Object.fromEntries(
        getPasswordRequirements("abcdef").map((r) => [r.id, r.satisfied]),
      );
      expect(byId.lowercase).toBe(true);
      expect(byId.notCommon).toBe(true);
      expect(byId.length).toBe(false);
      expect(byId.uppercase).toBe(false);
      expect(byId.digit).toBe(false);
      expect(byId.special).toBe(false);
    });
  });

  describe("getPasswordPolicyError — audit point 11 regression", () => {
    // The old UI only ever told the user "8 characters minimum", yet the
    // validator also required upper/lower/digit/special. A user who followed
    // the hint was then rejected. These tests pin that every requirement is
    // actually enforced and that the message names the missing rule.

    it("accepts a password satisfying every requirement", () => {
      expect(getPasswordPolicyError("Correct-Horse-9")).toBeNull();
      expect(isPasswordPolicyValid("Correct-Horse-9")).toBe(true);
    });

    it("rejects an 8-char lowercase password and names the missing rule", () => {
      const err = getPasswordPolicyError("abcdefgh");
      expect(err).not.toBeNull();
      expect(err).toContain("حرف كبير");
    });

    it("enforces the length boundaries and every character class", () => {
      expect(getPasswordPolicyError("Ab1!")).toContain("حرفًا");
      expect(
        getPasswordPolicyError("Aa1!" + "a".repeat(PASSWORD_MAX_LENGTH)),
      ).toContain("حرفًا");
      expect(getPasswordPolicyError("PASSWORD123")).toContain("حرف صغير");
      expect(getPasswordPolicyError("Password12")).toContain("رمز خاص");
      expect(getPasswordPolicyError("CorrectHorse")).toContain("رقم");
    });

    it("flags common passwords on the requirements checklist", () => {
      const common = getPasswordRequirements("password1").find((r) => r.id === "notCommon");
      expect(common?.satisfied).toBe(false);
      const fresh = getPasswordRequirements("Unique-Phrase-77").find((r) => r.id === "notCommon");
      expect(fresh?.satisfied).toBe(true);
    });
  });

  describe("getPasswordStrength", () => {
    it("scores empty input as the weakest bucket", () => {
      expect(getPasswordStrength("").score).toBe(0);
    });

    it("clamps to the strongest bucket", () => {
      expect(getPasswordStrength("Sup3r$ecretPassphrase2024!").score).toBe(3);
    });

    it("always exposes an Arabic label and a bar colour class for the UI", () => {
      const s = getPasswordStrength("weak");
      expect(typeof s.label).toBe("string");
      expect(s.className).toMatch(/^bg-/);
    });
  });
});
