import { describe, it, expect } from "vitest";
import {
  isStaffAdminPanelRole,
  ADMIN_PANEL_ROLES,
} from "@/lib/auth/admin-panel-roles";
import { ADMIN_PRIVILEGE_ROLES, UserRole } from "@/lib/auth/roles";

describe("isStaffAdminPanelRole", () => {
  it("allows staff admin roles", () => {
    for (const role of ADMIN_PANEL_ROLES) {
      expect(isStaffAdminPanelRole(role)).toBe(true);
    }
  });

  it("rejects student / non-staff roles", () => {
    expect(isStaffAdminPanelRole("STUDENT")).toBe(false);
    expect(isStaffAdminPanelRole("PARENT")).toBe(false);
    expect(isStaffAdminPanelRole("TEACHER")).toBe(false);
    expect(isStaffAdminPanelRole("")).toBe(false);
  });

  it("rejects null / undefined / missing role", () => {
    expect(isStaffAdminPanelRole(null)).toBe(false);
    expect(isStaffAdminPanelRole(undefined)).toBe(false);
  });

  it("is case-tolerant (wire casing must not change panel entry)", () => {
    expect(isStaffAdminPanelRole("admin")).toBe(true);
    expect(isStaffAdminPanelRole("  support ")).toBe(true);
    expect(isStaffAdminPanelRole("student")).toBe(false);
  });

  it("rejects unknown roles (fail closed, never default-allow)", () => {
    expect(isStaffAdminPanelRole("BOGUS")).toBe(false);
    expect(isStaffAdminPanelRole("PREMIUM")).toBe(false);
  });

  it("keeps privilege ⊆ panel: every isAdmin() role opens the shell, SUPPORT stays panel-only", () => {
    for (const role of ADMIN_PRIVILEGE_ROLES) {
      expect(ADMIN_PANEL_ROLES).toContain(role);
    }
    expect(ADMIN_PANEL_ROLES).toContain(UserRole.SUPPORT);
    expect(ADMIN_PRIVILEGE_ROLES).not.toContain(UserRole.SUPPORT);
    expect(isStaffAdminPanelRole(UserRole.SUPPORT)).toBe(true);
  });
});