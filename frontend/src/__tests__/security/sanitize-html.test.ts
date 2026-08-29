import { describe, it, expect } from "vitest";
import { sanitizeRichTextHtml } from "@/lib/security/sanitize-html";

/**
 * اختبارات معقّم HTML للدروس — هذا هو خط الدفاع الأساسي ضد XSS المخزّن
 * (محتوى الدروس يأتي من المدرّسين ويُعرض بـ dangerouslySetInnerHTML).
 */
describe("sanitizeRichTextHtml", () => {
  it("returns empty string for null/undefined/empty input", () => {
    expect(sanitizeRichTextHtml(null)).toBe("");
    expect(sanitizeRichTextHtml(undefined)).toBe("");
    expect(sanitizeRichTextHtml("")).toBe("");
  });

  it("preserves legitimate rich-text content", () => {
    const html = "<h2>العنوان</h2><p>نص <strong>عريض</strong> و<em>مائل</em>.</p>";
    const result = sanitizeRichTextHtml(html);
    expect(result).toContain("<h2>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });

  it("keeps lists and tables used in lessons", () => {
    const html = "<ul><li>بند</li></ul><table><tr><td>خلية</td></tr></table>";
    expect(sanitizeRichTextHtml(html)).toContain("<li>");
    expect(sanitizeRichTextHtml(html)).toContain("<td>");
  });

  // ─── حقن السكربتات ───────────────────────────────────────────────────────
  it("strips <script> tags entirely", () => {
    const result = sanitizeRichTextHtml('<p>safe</p><script>alert("xss")</script>');
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).toContain("safe");
  });

  it("strips inline event handlers (onerror/onload)", () => {
    const result = sanitizeRichTextHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });

  it("strips javascript: URIs in href", () => {
    const result = sanitizeRichTextHtml('<a href="javascript:alert(1)">رابط</a>');
    expect(result).not.toContain("javascript:");
  });

  it("strips <iframe> (clickjacking / hosted attack pages)", () => {
    const result = sanitizeRichTextHtml('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain("iframe");
    expect(result).not.toContain("evil.com");
  });

  it("strips <form> and inputs (phishing inside lesson content)", () => {
    const result = sanitizeRichTextHtml(
      '<form action="https://evil.com"><input name="password" type="password"></form>'
    );
    expect(result).not.toContain("form");
    expect(result).not.toContain("input");
    expect(result).not.toContain("evil.com");
  });

  it("strips <object>, <embed>, <base>, <meta>, <link>", () => {
    const vectors = [
      '<object data="https://evil.com/x.swf"></object>',
      '<embed src="https://evil.com/x.svg">',
      '<base href="https://evil.com/">',
      '<meta http-equiv="refresh" content="0;url=https://evil.com">',
      '<link rel="stylesheet" href="https://evil.com/x.css">',
    ];
    for (const vector of vectors) {
      const result = sanitizeRichTextHtml(vector);
      expect(result).not.toContain("evil.com");
      expect(result).not.toMatch(/<(object|embed|base|meta|link)/i);
    }
  });

  it("removes data-* attributes (no rendering value, smuggling vector)", () => {
    const result = sanitizeRichTextHtml('<p data-payload="exfil">نص</p>');
    expect(result).not.toContain("data-payload");
  });

  // ─── تحصين الروابط (reverse tabnabbing) ──────────────────────────────────
  it("hardens anchors with target=_blank and rel=noopener noreferrer", () => {
    const result = sanitizeRichTextHtml('<a href="https://example.com">موقع</a>');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain("https://example.com");
  });

  it("does not add target/rel when the anchor has no href", () => {
    const result = sanitizeRichTextHtml("<a>مرساة فقط</a>");
    expect(result).not.toContain('target="_blank"');
  });
});
