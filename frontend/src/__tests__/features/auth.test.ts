import { describe, it, expect } from "vitest";
import {
  UserRole,
  normalizeRole,
  deriveAccountStatus,
  getPasswordStrength,
  login,
  verifyMfa,
  registerPasskey,
  useAuth,
  usePermission,
  AuthProvider,
  AccountStatusGate,
  LoginForm,
  RegisterForm,
} from "@/features/auth";

describe("features/auth Domain Boundary (P0-11)", () => {
  it("exports all canonical domain models and functions", () => {
    expect(UserRole).toBeDefined();
    expect(normalizeRole).toBeInstanceOf(Function);
    expect(deriveAccountStatus).toBeInstanceOf(Function);
    expect(getPasswordStrength).toBeInstanceOf(Function);
  });

  it("exports auth API service gateways", () => {
    expect(login).toBeInstanceOf(Function);
    expect(verifyMfa).toBeInstanceOf(Function);
    expect(registerPasskey).toBeInstanceOf(Function);
  });

  it("exports hooks and state providers", () => {
    expect(useAuth).toBeInstanceOf(Function);
    expect(usePermission).toBeInstanceOf(Function);
    expect(AuthProvider).toBeInstanceOf(Function);
  });

  it("exports UI components", () => {
    expect(AccountStatusGate).toBeDefined();
    expect(LoginForm).toBeDefined();
    expect(RegisterForm).toBeDefined();
  });
});
