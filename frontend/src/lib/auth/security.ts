import { NextRequest } from "next/server";

export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return btoa(String.fromCharCode(...bytes));
    } catch {
      // silent fail
    }
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

export function getDomainFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function getCSPHeader(nonce: string, isDev: boolean, url: URL): string {
  const supabaseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const apiOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_API_URL);
  const baseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const vercelOrigin = process.env.VERCEL_URL
    ? (process.env.VERCEL_URL.startsWith("http") ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`)
    : "";

  const requestWsOrigin = url.origin.replace(/^http/, 'ws');
  const apiWsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : "";
  const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace(/^http/, 'ws') : "";
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST?.trim();
  const customWsOrigin = wsHost
    ? (wsHost.startsWith('ws:') || wsHost.startsWith('wss:') ? wsHost : `wss://${wsHost}`)
    : '';

  const connectSources = [
    "'self'",
    "https://tolo.app",
    "https://clerk.tolo.app",
    "https://clerk.tolo.com",
    "https://tolo.com",
    "https://*.tolo.com",
    "https://accounts.tolo.com",
    "https://frontend-api.clerk.services",
    "https://clerk-telemetry.com",
    "https://*.clerk-telemetry.com",
    "https://challenges.cloudflare.com",
    "https://cdn.jsdelivr.net",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    requestWsOrigin,
  ];

  if (apiWsOrigin) connectSources.push(apiWsOrigin);
  if (supabaseWsOrigin) connectSources.push(supabaseWsOrigin);
  if (customWsOrigin) connectSources.push(customWsOrigin);
  if (supabaseOrigin) connectSources.push(supabaseOrigin);
  if (apiOrigin) connectSources.push(apiOrigin);
  if (baseOrigin) connectSources.push(baseOrigin);
  if (vercelOrigin) connectSources.push(vercelOrigin);

  if (isDev) {
    connectSources.push("https://*.vercel.app", "https://*.supabase.co");
  }

  const frameSources = [
    "'self'",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://clerk.tolo.app",
    "https://clerk.tolo.com",
    "https://tolo.com",
    "https://*.tolo.com",
    "https://accounts.tolo.com",
    "https://frontend-api.clerk.services",
    "https://challenges.cloudflare.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
  ];

  const frameAncestors = ["'self'", "https://tolo.app", "https://www.tolo.app"];
  if (baseOrigin) frameAncestors.push(baseOrigin);

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'sha256-HOy+N/XLxP4bBXPgFk73cDMc524cZhcklyvEq7GJ34c=' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://*.clerk.accounts.dev https://clerk.tolo.app https://clerk.tolo.com https://tolo.com https://*.tolo.com https://accounts.tolo.com https://*.clerk.com https://challenges.cloudflare.com https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com https://frontend-cdn.perplexity.ai data:",
    "worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors.join(" ")}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].filter(Boolean).join("; ");
}
