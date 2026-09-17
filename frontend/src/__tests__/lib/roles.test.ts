import { describe, it, expect } from "vitest";
import {
  UserRole,
  USER_ROLES,
  ADMIN_PRIVILEGE_ROLES,
  normalizeRole,
  isKnownRole,
} from "@/lib/auth/roles";
import { UserRole as SharedUserRole } from "@thanawy/shared/types/enums";

describe("canonical role module", () => {
  it("re-exports the exact shared enum (single source of truth, not a copy)", () => {
    expect(UserRole).toBe(SharedUserRole);
    expect(Object.values(USER_ROLES).sort()).toEqual(
      Object.values(SharedUserRole).sort()
    );
  });

  it("covers every backend role", () => {
    for (const role of [
      "STUDENT",
      "TEACHER",
      "PARENT",
      "SUPPORT",
      "ADMIN",
      "SUPER_ADMIN",
      "MODERATOR",
    ] as const) {
      expect(USER_ROLES).toContain(role);
    }
    expect(USER_ROLES).not.toContain("PREMIUM" as never);
  });
});

describe("normalizeRole", () => {
  it("accepts canonical roles", () => {
    expect(normalizeRole("ADMIN")).toBe(UserRole.ADMIN);
    expect(normalizeRole("STUDENT")).toBe(UserRole.STUDENT);
  });

  it("is case-tolerant and trims (wire casing must not change gating)", () => {
    expect(normalizeRole("admin")).toBe(UserRole.ADMIN);
    expect(normalizeRole("  super_admin  ")).toBe(UserRole.SUPER_ADMIN);
    expect(normalizeRole("teacher")).toBe(UserRole.TEACHER);
  });

  it("fails closed on unknown, empty, or non-string values", () => {
    expect(normalizeRole("BOGUS")).toBeNull();
    expect(normalizeRole("PREMIUM")).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole("   ")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole(42)).toBeNull();
    expect(normalizeRole({})).toBeNull();
  });

  it("isKnownRole mirrors normalizeRole as a type guard", () => {
    expect(isKnownRole("MODERATOR")).toBe(true);
    expect(isKnownRole("nope")).toBe(false);
    const value: unknown = "SUPPORT";
    if (isKnownRole(value)) {
      const role: UserRole = value;
      expect(role).toBe(UserRole.SUPPORT);
    } else {
      expect.unreachable();
    }
  });
});

describe("ADMIN_PRIVILEGE_ROLES", () => {
  it("holds full-privilege roles without the panel-only SUPPORT", () => {
    expect(ADMIN_PRIVILEGE_ROLES).toContain(UserRole.ADMIN);
    expect(ADMIN_PRIVILEGE_ROLES).toContain(UserRole.SUPER_ADMIN);
    expect(ADMIN_PRIVILEGE_ROLES).toContain(UserRole.MODERATOR);
    expect(ADMIN_PRIVILEGE_ROLES).not.toContain(UserRole.SUPPORT);
  });
});
