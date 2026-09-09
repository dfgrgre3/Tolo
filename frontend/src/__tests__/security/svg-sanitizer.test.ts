import { describe, it, expect, vi } from "vitest";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import { uploadLargeFile } from "@/lib/storage/client";
import { apiClient } from "@/lib/api/api-client";

/**
 * اختبارات معقّم SVG — يحمي مسار الرفع من تهريب سكربتات داخل ملفات SVG
 * (foreignObject / أحداث SMIL / data: URIs).
 */
describe("sanitizeSvg", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeSvg("")).toBe("");
  });

  it("keeps a clean, safe SVG intact", () => {
    const clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="red"/></svg>';
    const result = sanitizeSvg(clean);
    expect(result).toContain("circle");
    expect(result).toContain("svg");
    expect(result).toContain('fill="red"');
  });

  it("keeps paths and groups (typical icons)", () => {
    const icon = '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0 L10 10"/></g></svg>';
    const result = sanitizeSvg(icon);
    expect(result).toContain("<path");
    expect(result).toContain("<g");
  });

  // ─── نواقل الهجوم ────────────────────────────────────────────────────────
  it("strips <script> inside SVG", () => {
    const evil = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(evil);
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
  });

  it("strips <foreignObject> (HTML/JS smuggling)", () => {
    const evil = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div onclick="alert(1)">x</div></foreignObject></svg>';
    const result = sanitizeSvg(evil);
    expect(result).not.toContain("foreignObject");
    expect(result).not.toContain("onclick");
  });

  it("strips event handler attributes (onload/onerror/onclick)", () => {
    const vectors = [
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)" width="1" height="1"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onerror="alert(1)" width="1" height="1"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="1" height="1"/></svg>',
    ];
    for (const vector of vectors) {
      expect(sanitizeSvg(vector)).not.toContain("alert");
    }
  });

  it("strips external resource loading via <link>/<image href=evil>", () => {
    const evil = '<svg xmlns="http://www.w3.org/2000/svg"><link href="https://evil.com/x.css"/></svg>';
    const result = sanitizeSvg(evil);
    expect(result).not.toContain("evil.com");
    expect(result).not.toContain("<link");
  });

  it("blocks data: URI payloads in href", () => {
    const evil = '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html,<script>alert(1)</script>"><rect width="1" height="1"/></a></svg>';
    const result = sanitizeSvg(evil);
    expect(result).not.toContain("data:text/html");
    expect(result).not.toContain("<script");
  });
});

describe("large SVG upload invariant", () => {
  it("sanitizes bytes before the presigned PUT", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      uploadUrl: "https://upload.example/put",
      fileKey: "uploads/clean.svg",
      publicUrl: "https://cdn.example/clean.svg",
      expiresIn: 900,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>';
    const largeSvg = {
      name: "image.svg",
      type: "image/svg+xml",
      size: 51 * 1024 * 1024,
      lastModified: 0,
      text: async () => rawSvg,
    } as File;

    await uploadLargeFile({ bucket: "uploads", file: largeSvg });

    const body = fetchSpy.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(File);
    expect(await (body as File).text()).not.toContain("<script");
    expect(post).toHaveBeenCalledWith("/upload/presign", expect.objectContaining({
      fileName: "image.svg",
      contentType: "image/svg+xml",
    }));
    post.mockRestore();
    fetchSpy.mockRestore();
  });
});
