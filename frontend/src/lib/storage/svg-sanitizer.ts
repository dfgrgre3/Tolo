/**
 * Safe SVG Sanitizer
 * A lightweight, zero-dependency utility to sanitize SVG content on both server and client.
 * Prevents XSS and XXE attacks by removing script tags, event handlers, javascript: links, and XML entities.
 */
export function sanitizeSvg(svgText: string): string {
  if (!svgText) return "";

  let sanitized = svgText;

  // 1. Remove XML External Entities (XXE) and DocType declarations
  sanitized = sanitized.replace(/<!DOCTYPE\b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<!ENTITY\b[^>]*>/gi, "");

  // 2. Remove <script>...</script> tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 3. Remove inline event handlers (onmouseover, onload, etc.)
  // Handles attributes like onload="...", onload='...', and onload=...
  sanitized = sanitized.replace(/\bon[a-zA-Z]+\s*=\s*(["'])(.*?)\1/gi, "");
  sanitized = sanitized.replace(/\bon[a-zA-Z]+\s*=\s*([^>\s"'`]+)/gi, "");

  // 4. Remove javascript: URLs in href/xlink:href
  sanitized = sanitized.replace(/\bhref\s*=\s*(["'])javascript:(.*?)\1/gi, "");
  sanitized = sanitized.replace(/\bxlink:href\s*=\s*(["'])javascript:(.*?)\1/gi, "");
  sanitized = sanitized.replace(/\bhref\s*=\s*([^>\s"'`]+javascript:[^>\s"'`]+)/gi, "");
  sanitized = sanitized.replace(/\bxlink:href\s*=\s*([^>\s"'`]+javascript:[^>\s"'`]+)/gi, "");

  return sanitized;
}
