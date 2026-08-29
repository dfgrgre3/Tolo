/**
 * Rich-text HTML sanitizer for backend-provided lesson/course content.
 *
 * Lesson content is authored by teachers and stored as HTML in the backend.
 * Rendering it with dangerouslySetInnerHTML without sanitization is a stored
 * XSS vector (a malicious or compromised teacher account could inject scripts
 * executed by every student viewing the lesson).
 *
 * Uses DOMPurify (structural DOM-based sanitization — no regex bypasses).
 */
import DOMPurify from "isomorphic-dompurify";

const CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  // Standard HTML allowlist (headings, lists, tables, img, video, audio,
  // links, etc.). SVG/MathML profiles intentionally NOT enabled.
  USE_PROFILES: { html: true },

  FORBID_TAGS: [
    "script",
    "iframe", // hosted attack pages / clickjacking
    "object",
    "embed",
    "form", // phishing (fake login) inside lesson content
    "input",
    "button",
    "select",
    "textarea",
    "link",
    "meta",
    "base",
  ],

  // Needed so target="_blank" (added by the hook below) survives sanitization.
  ADD_ATTR: ["target"],

  // data-* attributes carry no rendering value in lesson HTML.
  ALLOW_DATA_ATTR: false,
};

let hookRegistered = false;
function registerLinkHook() {
  if (hookRegistered) return;
  hookRegistered = true;
  // Harden links: anchors always open in a new tab with rel="noopener
  // noreferrer" (reverse tabnabbing protection).
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeRichTextHtml(html: string | null | undefined): string {
  if (!html) return "";
  registerLinkHook();
  return DOMPurify.sanitize(html, CONFIG);
}
