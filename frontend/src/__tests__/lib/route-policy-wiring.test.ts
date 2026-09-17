import { describe, it, expect } from "vitest";
import {
  PUBLIC_API_ENDPOINTS,
  isPublicApiEndpoint as guardsIsPublicApiEndpoint,
} from "@/lib/auth/route-guards";
import {
  PUBLIC_API_ROUTES,
  isPublicApiPath,
} from "@/lib/security/policy/route-policy";
import { isPublicApiPath as routingIsPublicApiPath } from "@/proxy-pipeline/routing";

/**
 * P001 regression guard: proves the whole re-export chain
 *   route-guards.ts -> route-policy.ts -> proxy-pipeline/routing.ts
 * still resolves to the SAME canonical list and the SAME classification
 * result, not a parallel copy that could silently drift again.
 *
 * This does not duplicate the semantic coverage in route-guards.test.ts
 * (prefix-safety, nested paths, etc.) - it only proves the wiring between
 * modules that route-guards.test.ts alone cannot see, since it imports
 * only from route-guards.ts.
 */
describe("public API policy wiring (route-guards -> route-policy -> proxy-pipeline)", () => {
  it("route-policy re-exports the exact same array reference as route-guards", () => {
    expect(PUBLIC_API_ROUTES).toBe(PUBLIC_API_ENDPOINTS);
  });

  it("/api/courses is present in the canonical list (regression: was previously missing here)", () => {
    expect(PUBLIC_API_ENDPOINTS).toContain("/api/courses");
  });

  it("route-policy.isPublicApiPath agrees with route-guards.isPublicApiEndpoint for every declared public endpoint", () => {
    for (const endpoint of PUBLIC_API_ENDPOINTS) {
      expect(isPublicApiPath(endpoint)).toBe(true);
      expect(guardsIsPublicApiEndpoint(endpoint)).toBe(true);
    }
  });

  it("the proxy-pipeline entry point (what runProxyPipeline actually calls) agrees with the canonical source", () => {
    const sample = [
      "/api/courses",
      "/api/categories",
      "/api/teachers",
      "/api/homepage",
      "/api/blog",
      "/api/navigation/menu",
      "/api/settings",
      "/api/profile",
      "/api/student",
      "/api/teaching",
      "/api/settings-secret",
      "/api/courses/create-bulk",
    ];
    for (const path of sample) {
      expect(routingIsPublicApiPath(path)).toBe(guardsIsPublicApiEndpoint(path));
    }
  });

  it("prefix lookalikes of public routes are NOT public through any layer", () => {
    const lookalikes = [
      "/api/courses-admin",
      "/api/categories-secret",
      "/api/settings-secret",
      "/api/blog-internal",
    ];
    for (const path of lookalikes) {
      expect(guardsIsPublicApiEndpoint(path)).toBe(false);
      expect(isPublicApiPath(path)).toBe(false);
      expect(routingIsPublicApiPath(path)).toBe(false);
    }
  });

  it("nested sub-paths follow the declared per-endpoint match mode", () => {
    // subtree rules: detail URLs stay public (no forced login on browsing)
    expect(guardsIsPublicApiEndpoint("/api/courses/123")).toBe(true);
    expect(isPublicApiPath("/api/courses/123")).toBe(true);
    expect(routingIsPublicApiPath("/api/courses/123")).toBe(true);
    expect(guardsIsPublicApiEndpoint("/api/blog/some-slug")).toBe(true);
    // exact rules: sub-paths stay protected
    expect(guardsIsPublicApiEndpoint("/api/settings/private")).toBe(false);
    expect(isPublicApiPath("/api/settings/private")).toBe(false);
    expect(routingIsPublicApiPath("/api/settings/private")).toBe(false);
    // role-gated wins over public even under a public subtree
    expect(guardsIsPublicApiEndpoint("/api/courses/create")).toBe(false);
    expect(isPublicApiPath("/api/courses/create")).toBe(false);
    // sensitive leaves never open
    expect(guardsIsPublicApiEndpoint("/api/blog/admin")).toBe(false);
    expect(isPublicApiPath("/api/blog/admin")).toBe(false);
  });
});
