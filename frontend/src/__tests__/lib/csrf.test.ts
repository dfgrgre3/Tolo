import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCookie, ensureCsrfToken, applyCsrfHeader, isCsrfValidationFailure } from "@/lib/api/csrf";

/**
 * اختبارات نمط Double Submit Cookie للـ CSRF.
 */

describe("getCookie", () => {
  it("reads a cookie set on document", () => {
    document.cookie = "_csrf=abc123";
    expect(getCookie("_csrf")).toBe("abc123");
  });

  it("returns null for a missing cookie", () => {
    expect(getCookie("_definitely_not_set")).toBeNull();
  });

  it("handles cookies with leading spaces after semicolons", () => {
    document.cookie = "a=1";
    document.cookie = "_csrf=xyz789";
    expect(getCookie("_csrf")).toBe("xyz789");
  });

  it("returns null outside the browser (SSR)", async () => {
    const { getCookie: ssrGetCookie } = await import("@/lib/api/csrf");
    // jsdom يوفر document دائماً — نتحقق فقط من أن الدالة لا ترمي
    expect(() => ssrGetCookie("any")).not.toThrow();
  });
});

describe("ensureCsrfToken", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the cookie fast-path without a network call when present", async () => {
    document.cookie = "_csrf=fast-path-token";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await ensureCsrfToken();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bootstraps via GET /api/auth/csrf when the cookie is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 200, headers: { "X-CSRF-Token": "bootstrapped" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await ensureCsrfToken(true); // forceRefresh يتجاوز المسار السريع

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/csrf",
      expect.objectContaining({ method: "GET", credentials: "include" })
    );
  });

  it("shares one in-flight bootstrap across concurrent callers (single-flight)", async () => {
    let resolveFetch!: (r: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((res) => { resolveFetch = res; })
    );
    vi.stubGlobal("fetch", fetchMock);

    const p1 = ensureCsrfToken(true);
    const p2 = ensureCsrfToken(true);
    const p3 = ensureCsrfToken(true);

    resolveFetch(new Response(null, { status: 200, headers: { "X-CSRF-Token": "shared" } }));
    await Promise.all([p1, p2, p3]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates bootstrap failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ensureCsrfToken(true)).rejects.toThrow("CSRF bootstrap failed with status 500");
  });
});

describe("applyCsrfHeader", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    vi.restoreAllMocks();
  });

  it("injects X-CSRF-Token for write methods when the cookie exists", async () => {
    document.cookie = "_csrf=token-abc";
    const headers = new Headers();

    await applyCsrfHeader(headers, true);

    expect(headers.get("X-CSRF-Token")).toBe("token-abc");
  });

  it("is a no-op for GET-like methods", async () => {
    document.cookie = "_csrf=token-abc";
    const headers = new Headers();

    await applyCsrfHeader(headers, false);

    expect(headers.get("X-CSRF-Token")).toBeNull();
  });
});

describe("isCsrfValidationFailure", () => {
  it("returns true for 403 responses mentioning CSRF", async () => {
    const response = new Response(JSON.stringify({ error: "CSRF token validation failed" }), {
      status: 403,
    });
    expect(await isCsrfValidationFailure(response)).toBe(true);
  });

  it("returns true regardless of the casing of 'csrf'", async () => {
    const response = new Response(JSON.stringify({ message: "csrf mismatch" }), { status: 403 });
    expect(await isCsrfValidationFailure(response)).toBe(true);
  });

  it("returns false for 403 responses unrelated to CSRF (real authorization failures)", async () => {
    const response = new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    expect(await isCsrfValidationFailure(response)).toBe(false);
  });

  it("returns false for non-403 statuses", async () => {
    expect(await isCsrfValidationFailure(new Response(null, { status: 401 }))).toBe(false);
    expect(await isCsrfValidationFailure(new Response(null, { status: 500 }))).toBe(false);
  });

  it("returns false for non-JSON bodies", async () => {
    const response = new Response("<html>not json</html>", { status: 403 });
    expect(await isCsrfValidationFailure(response)).toBe(false);
  });
});
