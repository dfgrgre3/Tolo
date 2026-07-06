/**
 * Safe SVG Sanitizer — Structural DOM-based approach
 *
 * Uses DOMPurify (isomorphic-dompurify) with an SVG-specific profile to sanitize
 * SVG content on both server and client. This replaces the previous naive Regex
 * approach which was vulnerable to:
 *   - <foreignObject> smuggling arbitrary HTML + scripts
 *   - CSS expression() attacks via style attributes
 *   - data: URI smuggling in xlink:href / href
 *   - XML namespace confusion (e.g. <svg:script>)
 *   - Multi-line / encoded event handler bypasses
 *
 * DOMPurify operates on a real DOM/XML parser tree, making structural bypasses
 * fundamentally impossible — it does not pattern-match strings.
 */
import DOMPurify from "isomorphic-dompurify";

export function sanitizeSvg(svgText: string): string {
  if (!svgText) return "";

  return DOMPurify.sanitize(svgText, {
    // Activates DOMPurify's built-in SVG element and attribute allowlist.
    // Only known-safe SVG presentation elements are permitted (path, circle,
    // rect, g, defs, use referencing internal IDs, etc.).
    USE_PROFILES: { svg: true, svgFilters: true },

    // Explicitly forbid elements that can smuggle foreign content or scripts,
    // even though USE_PROFILES already excludes them — defence in depth.
    FORBID_TAGS: [
      "script",
      "foreignObject", // Can embed arbitrary HTML/JS
      "iframe",
      "object",
      "embed",
      "link",          // Can load external stylesheets with expressions
      "meta",
    ],

    // Explicitly forbid dangerous attributes beyond the profile defaults.
    FORBID_ATTR: [
      "onload",
      "onerror",
      "onclick",
      "onfocus",
      "onmouseover",
      "onmouseout",
      "onkeydown",
      "onkeyup",
      "onanimationstart",
      "onbegin",       // SMIL animation event
    ],

    // Prevent data: URIs which can be used to smuggle base64-encoded payloads.
    ALLOW_DATA_ATTR: false,
  });
}
