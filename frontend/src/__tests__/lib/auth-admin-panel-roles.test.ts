import { describe, it, expect } from "vitest";
import {
  isStaffAdminPanelRole,
  ADMIN_PANEL_ROLES,
} from "@/lib/auth/admin-panel-roles";

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
});