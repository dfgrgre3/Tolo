import { describe, it, expect } from "vitest";
import {
  matchesPath,
  isAdminRoute,
  isProtectedRoute,
  isGuestRoute,
  isPublicApiEndpoint,
  findRoleRule,
  ROLE_RULES,
  TEACHER_ENDPOINT_ROLES,
  STUDENT_ENDPOINT_ROLES,
  hasRole,
} from "@/lib/auth/route-guards";

describe("matchesPath", () => {
  it("matches the exact route", () => {
    expect(matchesPath("/profile", "/profile")).toBe(true);
  });

  it("matches sub-paths of the route", () => {
    expect(matchesPath("/profile/settings", "/profile")).toBe(true);
    expect(matchesPath("/learning/course-123", "/learning")).toBe(true);
  });

  it("rejects prefix siblings that share only text", () => {
    expect(matchesPath("/profiled", "/profile")).toBe(false);
    expect(matchesPath("/profile-anything", "/profile")).toBe(false);
    expect(matchesPath("/dashboard-extra", "/dashboard")).toBe(false);
  });
});

describe("isProtectedRoute", () => {
  it("protects real protected pages and their sub-paths", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/analytics")).toBe(true);
    expect(isProtectedRoute("/profile")).toBe(true);
    expect(isProtectedRoute("/profile/settings")).toBe(true);
    expect(isProtectedRoute("/learning/course-123")).toBe(true);
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/users")).toBe(true);
  });

  it("does NOT protect text-prefix lookalikes", () => {
    expect(isProtectedRoute("/profiled")).toBe(false);
    expect(isProtectedRoute("/profile-anything")).toBe(false);
    expect(isProtectedRoute("/dashboarding")).toBe(false);
    expect(isProtectedRoute("/learning-path")).toBe(false);
    expect(isProtectedRoute("/admin-login")).toBe(false);
    expect(isProtectedRoute("/administrator")).toBe(false);
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/about")).toBe(false);
  });
});

describe("isAdminRoute", () => {
  it("flags /admin and its sub-paths", () => {
    expect(isAdminRoute("/admin")).toBe(true);
    expect(isAdminRoute("/admin/users")).toBe(true);
  });

  it("does not flag lookalike paths", () => {
    expect(isAdminRoute("/admin-login")).toBe(false);
    expect(isAdminRoute("/administrator")).toBe(false);
    expect(isAdminRoute("/admin-extra")).toBe(false);
  });
});

describe("isGuestRoute", () => {
  it("flags guest pages and their sub-paths", () => {
    expect(isGuestRoute("/login")).toBe(true);
    expect(isGuestRoute("/register")).toBe(true);
    expect(isGuestRoute("/forgot-password")).toBe(true);
    expect(isGuestRoute("/mfa")).toBe(true);
    expect(isGuestRoute("/mfa/verify")).toBe(true);
  });

  it("does not flag lookalike paths", () => {
    expect(isGuestRoute("/login-2fa")).toBe(false);
    expect(isGuestRoute("/register-now")).toBe(false);
    expect(isGuestRoute("/mfa-history")).toBe(false);
  });
});

describe("isPublicApiEndpoint", () => {
  it("flags declared public endpoints and their sub-paths", () => {
    expect(isPublicApiEndpoint("/api/categories")).toBe(true);
    expect(isPublicApiEndpoint("/api/categories/123")).toBe(true);
    expect(isPublicApiEndpoint("/api/teachers")).toBe(true);
    expect(isPublicApiEndpoint("/api/homepage")).toBe(true);
    expect(isPublicApiEndpoint("/api/settings")).toBe(true);
  });

  it("does NOT treat text-prefix lookalikes as public", () => {
    expect(isPublicApiEndpoint("/api/settings-secret")).toBe(false);
    expect(isPublicApiEndpoint("/api/settingsx")).toBe(false);
    expect(isPublicApiEndpoint("/api/categories-admin")).toBe(false);
    expect(isPublicApiEndpoint("/api/teachers-extra")).toBe(false);
    expect(isPublicApiEndpoint("/api/homepage-v2")).toBe(false);
  });
});

describe("findRoleRule", () => {
  it("returns a rule for teacher-gated endpoints and their sub-paths", () => {
    const teachingRule = findRoleRule("/api/teaching");
    expect(teachingRule).not.toBeNull();
    expect(teachingRule?.allowedRoles).toEqual(TEACHER_ENDPOINT_ROLES);

    const createCourseRule = findRoleRule("/api/courses/create");
    expect(createCourseRule).not.toBeNull();
    expect(createCourseRule?.allowedRoles).toEqual(TEACHER_ENDPOINT_ROLES);

    // Sub-path is matched too.
    expect(findRoleRule("/api/teaching/dashboard")).not.toBeNull();
  });

  it("returns a rule for student-gated endpoints and their sub-paths", () => {
    const studentRule = findRoleRule("/api/student");
    expect(studentRule).not.toBeNull();
    expect(studentRule?.allowedRoles).toEqual(STUDENT_ENDPOINT_ROLES);

    const submitExamRule = findRoleRule("/api/exams/submit");
    expect(submitExamRule).not.toBeNull();
    expect(submitExamRule?.allowedRoles).toEqual(STUDENT_ENDPOINT_ROLES);

    expect(findRoleRule("/api/student/grades")).not.toBeNull();
  });

  it("does NOT match prefix-sibling lookalikes", () => {
    // /api/teaching must not match /api/teaching-history
    expect(findRoleRule("/api/teaching-history")).toBeNull();
    // /api/courses/create must not match /api/courses/create-bulk
    expect(findRoleRule("/api/courses/create-bulk")).toBeNull();
    // /api/student must not match /api/students
    expect(findRoleRule("/api/students")).toBeNull();
    // /api/exams/submit must not match /api/exams/submitted
    expect(findRoleRule("/api/exams/submitted")).toBeNull();
  });

  it("returns null for undeclared paths (caller falls through to generic gate)", () => {
    expect(findRoleRule("/api/courses")).toBeNull();
    expect(findRoleRule("/api/profile")).toBeNull();
    expect(findRoleRule("/dashboard")).toBeNull();
    expect(findRoleRule("/")).toBeNull();
  });
});

describe("ROLE_RULES table", () => {
  it("declares no overlapping paths (every path is unique)", () => {
    const paths = ROLE_RULES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every rule has a non-empty allowedRoles list", () => {
    for (const rule of ROLE_RULES) {
      expect(rule.allowedRoles.length).toBeGreaterThan(0);
    }
  });

  it("every rule has a non-empty errorMessage", () => {
    for (const rule of ROLE_RULES) {
      expect(rule.errorMessage.length).toBeGreaterThan(0);
    }
  });
});

describe("hasRole", () => {
  it("accepts a role listed in allowed", () => {
    expect(hasRole("TEACHER", TEACHER_ENDPOINT_ROLES)).toBe(true);
    expect(hasRole("ADMIN", STUDENT_ENDPOINT_ROLES)).toBe(true);
  });

  it("rejects null/undefined roles", () => {
    expect(hasRole(null, TEACHER_ENDPOINT_ROLES)).toBe(false);
    expect(hasRole(undefined, TEACHER_ENDPOINT_ROLES)).toBe(false);
  });

  it("rejects roles not in the allow-list", () => {
    expect(hasRole("STUDENT", TEACHER_ENDPOINT_ROLES)).toBe(false);
    expect(hasRole("TEACHER", STUDENT_ENDPOINT_ROLES)).toBe(false);
  });
});
