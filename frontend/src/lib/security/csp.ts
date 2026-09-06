import { NextResponse } from 'next/server';

/**
 * Content-Security-Policy generation for document requests, extracted from
 * the Edge middleware (`src/proxy.ts`) so nonce/CSP concerns live separately
 * from the auth/routing logic.
 */

export function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary);
}

/**
 * Builds `connect-src` per environment.
 *
 * SECURITY: bare scheme wildcards (`https:`, `ws:`, `wss:`) previously allowed
 * the page to talk to ANY host — neutralizing the directive. They are replaced
 * by an explicit allowlist. The local Go backend (API + WebSocket) is only
 * permitted in development; production reaches the backend on *.vercel.app.
 * CSP violations are reported to /api/csp-report, so a missing host will
 * surface there instead of failing silently.
 */
function buildConnectSrc(): string {
  const isDev = process.env.NODE_ENV === "development";

  const sources = [
    "'self'",
    // Supabase — API, storage, and realtime websockets
    "https://*.supabase.co",
    "https://*.supabase.in",
    "wss://*.supabase.co",
    "wss://*.supabase.in",
    // Error monitoring
    "https://sentry.io",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
    // Vercel analytics + the Go backend deployed on Vercel
    "https://vitals.vercel-insights.com",
    "https://va.vercel-scripts.com",
    "https://*.vercel.app",
  ];

  if (isDev) {
    sources.push(
      "http://localhost:8082",
      "ws://localhost:8082",
      "http://127.0.0.1:8082",
      "ws://127.0.0.1:8082"
    );
  }

  return `connect-src ${sources.join(" ")}`;
}

export function applyCsp(response: NextResponse, nonce: string): NextResponse {
  const cspHeader = [
    "default-src 'self'",
    // script-src: nonce-only, no 'unsafe-inline' / 'unsafe-eval'. The nonce
    // is injected by the Edge middleware (see src/proxy.ts) and added to
    // every <script> the framework emits. Any script that does not carry
    // the matching nonce will be blocked by the browser.
    `script-src 'self' 'nonce-${nonce}' https://*.sentry.io https://*.vercel-insights.com https://*.vercel.com https://va.vercel-scripts.com https://www.youtube.com https://s.ytimg.com https://www.youtube-nocookie.com https://cdn.jsdelivr.net https://js.sentry-cdn.com`,
    // style-src: nonce for inline styles too. Tailwind/CSS-in-JS still
    // occasionally inject inline <style> tags; with the nonce they pass
    // without needing 'unsafe-inline'. If a third-party stylesheet cannot
    // be migrated, fall back to a per-host hash instead of broad
    // 'unsafe-inline'.
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' data: https://fonts.gstatic.com https://frontend-cdn.perplexity.ai",
    // img-src: explicit host allowlist. The previous `https:` wildcard
    // allowed any HTTPS origin to be a tracking/exfiltration target; we
    // restrict to known image sources only.
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://i.ytimg.com https://lh3.googleusercontent.com https://api.dicebear.com",
    "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://cdn.bunny.net https://*.b-cdn.net https://stream.cloudflare.com https://*.cloudflarestream.com https://*.youtube.com",
    buildConnectSrc(),
    "frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.paymob.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.paymob.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
    // Add CSP reporting for security monitoring and detection of violations
    "report-uri /api/csp-report",
    "report-to csp-endpoint",
  ].join('; ');

  // Add Report-To header for CSP reporting to detect violations
  response.headers.set('Report-To', JSON.stringify({
    group: "csp-endpoint",
    max_age: 10886400,
    endpoints: [{
      url: "/api/csp-report",
      priority: 1
    }]
  }));

  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
