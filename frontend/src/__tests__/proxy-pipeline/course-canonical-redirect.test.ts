import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * The old /courses/<uuid> address must 301 to /courses/<slug> so that a single
 * canonical URL exists per course. This drives canonicalizeCourseUrl directly
 * against a mocked backend lookup, covering the four decisions the function
 * actually makes: redirect, no-slug fallthrough, slug-equals-id fallthrough,
 * and the slug path that must never pay for a lookup.
 */

const UUID = "11111111-2222-3333-4444-555555555555";

vi.mock("@thanawy/shared/backend-url", () => ({
  getBackendApiUrl: (path: string) => `https://api.example.test${path}`,
}));

import { canonicalizeCourseUrl } from "@/proxy-pipeline/course-canonical-redirect";

function request(pathname: string): NextRequest {
  return new NextRequest(`https://example.test${pathname}`);
}

function mockDetail(payload: unknown, ok = true) {
  global.fetch = vi.fn(async () =>
    new Response(ok ? JSON.stringify(payload) : "", {
      status: ok ? 200 : 404,
      headers: { "content-type": "application/json" },
    }),
  ) as typeof global.fetch;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("canonicalizeCourseUrl: legacy /courses/<uuid> -> /courses/<slug>", () => {
  it("301-redirects a UUID path to the course's slug URL", async () => {
    mockDetail({ data: { subject: { slug: "physics" } } });

    const res = await canonicalizeCourseUrl(request(`/courses/${UUID}`));

    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(`https://example.test/courses/physics`);
  });

  it("accepts the slug nested under subject when the envelope has no data wrapper", async () => {
    mockDetail({ subject: { slug: "chemistry" } });

    const res = await canonicalizeCourseUrl(request(`/courses/${UUID}`));

    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(`https://example.test/courses/chemistry`);
  });

  it("preserves the rest of the path and query when canonicalizing", async () => {
    mockDetail({ data: { subject: { slug: "physics" } } });

    const res = await canonicalizeCourseUrl(request(`/courses/${UUID}/learn/some-lesson?tab=notes`));

    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(
      `https://example.test/courses/physics/learn/some-lesson?tab=notes`,
    );
  });

  it("falls through (null) when the course has no slug, so the page can 404", async () => {
    mockDetail({ data: { subject: { slug: null } } });

    expect(await canonicalizeCourseUrl(request(`/courses/${UUID}`))).toBeNull();
  });

  it("falls through when the resolved slug equals the id, to avoid a self-redirect loop", async () => {
    mockDetail({ data: { subject: { slug: UUID } } });

    expect(await canonicalizeCourseUrl(request(`/courses/${UUID}`))).toBeNull();
  });

  it("falls through when the backend does not know the id", async () => {
    mockDetail({}, false);

    expect(await canonicalizeCourseUrl(request(`/courses/${UUID}`))).toBeNull();
  });

  it("falls through on backend failure rather than breaking the render", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("connection refused");
    }) as typeof global.fetch;

    expect(await canonicalizeCourseUrl(request(`/courses/${UUID}`))).toBeNull();
  });

  it("never looks at the backend for an already-canonical slug path", async () => {
    global.fetch = vi.fn();

    expect(await canonicalizeCourseUrl(request("/courses/physics"))).toBeNull();
    expect(await canonicalizeCourseUrl(request("/courses/physics/learn/lesson-1"))).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("ignores non-UUID segments that merely resemble an id", async () => {
    global.fetch = vi.fn();

    // A short or malformed id is not a UUID, so it must not trigger a lookup.
    expect(await canonicalizeCourseUrl(request("/courses/abc"))).toBeNull();
    expect(await canonicalizeCourseUrl(request("/courses/12345"))).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
