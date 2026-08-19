import { describe, it, expect } from "vitest";
import {
  sanitizeRedirectPath,
  isAuthPublicRoute,
  DEFAULT_AUTHENTICATED_ROUTE,
} from "@/services/auth/navigation";

describe("sanitizeRedirectPath", () => {
  it("returns fallback when path is null/undefined/empty", () => {
    expect(sanitizeRedirectPath(null)).toBe(DEFAULT_AUTHENTICATED_ROUTE);
    expect(sanitizeRedirectPath(undefined)).toBe(DEFAULT_AUTHENTICATED_ROUTE);
    expect(sanitizeRedirectPath("")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
  });

  it("allows safe relative paths", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/courses/123")).toBe("/courses/123");
  });

  it("rejects protocol-relative and absolute external URLs", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
    expect(sanitizeRedirectPath("https://evil.com")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
    expect(sanitizeRedirectPath("http://evil.com")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
  });

  it("rejects non-relative paths", () => {
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
    expect(sanitizeRedirectPath("dashboard")).toBe(DEFAULT_AUTHENTICATED_ROUTE);
  });

  it("honors a custom fallback", () => {
    expect(sanitizeRedirectPath("https://evil.com", "/admin")).toBe("/admin");
    expect(sanitizeRedirectPath(null, "/admin")).toBe("/admin");
  });
});

describe("isAuthPublicRoute", () => {
  it("identifies public auth routes", () => {
    expect(isAuthPublicRoute("/login")).toBe(true);
    expect(isAuthPublicRoute("/register")).toBe(true);
    expect(isAuthPublicRoute("/forgot-password")).toBe(true);
    expect(isAuthPublicRoute("/admin-login")).toBe(true);
    expect(isAuthPublicRoute("/")).toBe(true);
  });

  it("rejects protected routes", () => {
    expect(isAuthPublicRoute("/dashboard")).toBe(false);
    expect(isAuthPublicRoute("/admin/users")).toBe(false);
    expect(isAuthPublicRoute("/courses")).toBe(false);
  });
});