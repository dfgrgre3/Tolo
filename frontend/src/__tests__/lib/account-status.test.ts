import { describe, it, expect } from "vitest";
import {
  deriveAccountStatus,
  isActiveAccount,
  isGuestAccount,
  isPendingVerification,
  isRestrictedAccount,
} from "@/lib/auth/account-status";

describe("deriveAccountStatus", () => {
  it("returns GUEST for a missing payload (never a pending state)", () => {
    expect(deriveAccountStatus(null)).toBe("GUEST");
    expect(deriveAccountStatus(undefined)).toBe("GUEST");
  });

  it("returns ACTIVE for a fully-verified active account", () => {
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: true, phoneVerified: true })
    ).toBe("ACTIVE");
  });

  it("returns ACTIVE for unknown or empty statuses (usable by default)", () => {
    expect(
      deriveAccountStatus({ status: "SOMETHING_NEW", emailVerified: true })
    ).toBe("ACTIVE");
    expect(deriveAccountStatus({ emailVerified: true })).toBe("ACTIVE");
  });

  it("routes unverified email to PENDING_EMAIL_VERIFICATION", () => {
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: false })
    ).toBe("PENDING_EMAIL_VERIFICATION");
  });

  it("never blocks on phoneVerified alone (no phone UI exists)", () => {
    // Bare unverified phone must NOT strand the account in PENDING_PHONE.
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: true, phoneVerified: false })
    ).toBe("ACTIVE");
    expect(
      deriveAccountStatus({
        status: "ACTIVE",
        emailVerified: true,
        phoneVerified: false,
        phone: "+201000000000",
      })
    ).toBe("ACTIVE");
  });

  it("reaches PENDING_PHONE only behind the explicit backend requirement", () => {
    expect(
      deriveAccountStatus({
        status: "ACTIVE",
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationRequired: true,
        phone: "+201000000000",
      })
    ).toBe("PENDING_PHONE_VERIFICATION");
  });

  it("maps BANNED to LOCKED (documented frontend name for the backend state)", () => {
    expect(
      deriveAccountStatus({ status: "BANNED", emailVerified: true })
    ).toBe("LOCKED");
  });

  it("maps INACTIVE to SUSPENDED (conservative fallback, never a deletion guess)", () => {
    expect(
      deriveAccountStatus({ status: "INACTIVE", emailVerified: true })
    ).toBe("SUSPENDED");
  });

  it("restrictions win over verification (suspended users see blocked, not verify-email)", () => {
    expect(
      deriveAccountStatus({ status: "SUSPENDED", emailVerified: false })
    ).toBe("SUSPENDED");
    expect(
      deriveAccountStatus({ status: "BANNED", emailVerified: false })
    ).toBe("LOCKED");
  });

  it("reaches deletion states only via explicit flags", () => {
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: true, deletionPending: true })
    ).toBe("DELETION_PENDING");
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: true, deleted: true })
    ).toBe("DELETED");
    // deleted beats deletionPending when both are (inconsistently) set.
    expect(
      deriveAccountStatus({
        status: "ACTIVE",
        emailVerified: true,
        deleted: true,
        deletionPending: true,
      })
    ).toBe("DELETED");
  });

  it("reaches PASSWORD_RESET_REQUIRED via the explicit flag or status string", () => {
    expect(
      deriveAccountStatus({ status: "ACTIVE", emailVerified: true, passwordResetRequired: true })
    ).toBe("PASSWORD_RESET_REQUIRED");
    expect(
      deriveAccountStatus({ status: "PASSWORD_RESET_REQUIRED", emailVerified: true })
    ).toBe("PASSWORD_RESET_REQUIRED");
  });

  it("matches statuses case-insensitively", () => {
    expect(
      deriveAccountStatus({ status: "suspended", emailVerified: true })
    ).toBe("SUSPENDED");
    expect(
      deriveAccountStatus({ status: "banned", emailVerified: true })
    ).toBe("LOCKED");
  });
});

describe("account status predicates", () => {
  it("GUEST is neither active, restricted, nor pending verification", () => {
    expect(isGuestAccount("GUEST")).toBe(true);
    expect(isActiveAccount("GUEST")).toBe(false);
    expect(isRestrictedAccount("GUEST")).toBe(false);
    expect(isPendingVerification("GUEST")).toBe(false);
  });

  it("classifies the remaining states", () => {
    expect(isActiveAccount("ACTIVE")).toBe(true);
    expect(isPendingVerification("PENDING_EMAIL_VERIFICATION")).toBe(true);
    expect(isPendingVerification("PENDING_PHONE_VERIFICATION")).toBe(true);
    expect(isPendingVerification("ACTIVE")).toBe(false);
    for (const s of [
      "SUSPENDED",
      "LOCKED",
      "PASSWORD_RESET_REQUIRED",
      "DELETION_PENDING",
      "DELETED",
    ] as const) {
      expect(isRestrictedAccount(s)).toBe(true);
    }
    expect(isRestrictedAccount("ACTIVE")).toBe(false);
  });
});
