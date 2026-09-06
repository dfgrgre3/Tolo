// Verifies that the headers() config in next.config.js produces the
// expected security header set. Run with `node scripts/verify-security-headers.mjs`.
import nextConfig from "../next.config.js";

const headers = await nextConfig.headers();

const htmlRoute = headers.find((h) => h.source.includes("?!api|_next/static"));
const apiRoute = headers.find((h) => h.source === "/api/:path*");

function getHeader(route, key) {
  return route?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

const checks = [
  ["HTML X-Content-Type-Options", htmlRoute, getHeader(htmlRoute, "X-Content-Type-Options"), "nosniff"],
  ["HTML X-Frame-Options", htmlRoute, getHeader(htmlRoute, "X-Frame-Options"), "DENY"],
  ["HTML HSTS", htmlRoute, getHeader(htmlRoute, "Strict-Transport-Security"), "max-age=63072000; includeSubDomains; preload"],
  ["HTML Referrer-Policy", htmlRoute, getHeader(htmlRoute, "Referrer-Policy"), "strict-origin-when-cross-origin"],
  ["HTML COOP", htmlRoute, getHeader(htmlRoute, "Cross-Origin-Opener-Policy"), "same-origin"],
  ["HTML CORP", htmlRoute, getHeader(htmlRoute, "Cross-Origin-Resource-Policy"), "same-origin"],
  ["HTML Permissions-Policy includes camera", htmlRoute, getHeader(htmlRoute, "Permissions-Policy")?.includes("camera=()"), true],
  ["HTML Permissions-Policy includes usb", htmlRoute, getHeader(htmlRoute, "Permissions-Policy")?.includes("usb=()"), true],
  ["HTML Permissions-Policy includes payment", htmlRoute, getHeader(htmlRoute, "Permissions-Policy")?.includes("payment=(self"), true],
  ["API X-Content-Type-Options", apiRoute, getHeader(apiRoute, "X-Content-Type-Options"), "nosniff"],
  ["API X-Frame-Options", apiRoute, getHeader(apiRoute, "X-Frame-Options"), "DENY"],
  ["API CORP", apiRoute, getHeader(apiRoute, "Cross-Origin-Resource-Policy"), "same-site"],
  ["API Vary", apiRoute, getHeader(apiRoute, "Vary"), "Origin"],
];

let failed = 0;
for (const [name, route, actual, expected] of checks) {
  if (!route) {
    console.error(`MISSING ROUTE: ${name}`);
    failed++;
    continue;
  }
  if (actual !== expected) {
    console.error(`FAIL: ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
    failed++;
  } else {
    console.log(`PASS: ${name}`);
  }
}

process.exit(failed === 0 ? 0 : 1);
