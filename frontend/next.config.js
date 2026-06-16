import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // ─── Basics ────────────────────────────────────────────────────────────────
  reactStrictMode: true,
  compress: true,           // gzip/brotli at the Next.js edge
  poweredByHeader: false,   // remove X-Powered-By header (minor security + bytes)

  // ─── Image optimisation ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2_592_000,   // 30 days (CDN cache)
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  outputFileTracingRoot: process.cwd(),
  // ─── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Tree-shake heavy packages — avoids importing the full library
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'sonner',
    ],
  },

  // ─── HTTP Headers ──────────────────────────────────────────────────────────
  async headers() {
    return [
      // Static assets — 1 year immutable cache (Next.js content-hashes them)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js image optimisation endpoint — 30 days
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      // Public folder assets (fonts, icons, sw.js, manifest, etc.)
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      // Service Worker — MUST NOT be cached (always fresh)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // HTML pages — stale-while-revalidate for instant subsequent loads
      {
        source: '/((?!api|_next/static|_next/image|favicon.svg|sw.js).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  // (add here if needed)

  // ─── Rewrites ──────────────────────────────────────────────────────────────
  async rewrites() {
    return [
      {
        // Clerk npm bundle proxy → jsDelivr CDN
        // When proxyUrl is set, Clerk SDK loads its JS bundles from /__clerk/npm/@clerk/...
        // frontend-api.clerk.services does NOT serve static npm files (returns 502).
        // jsDelivr is Clerk's CDN for npm packages — serves the actual JS bundles.
        //
        // This rule MUST come before the general /__clerk/:path* rule.
        source: "/__clerk/npm/@clerk/:path*",
        destination: "https://cdn.jsdelivr.net/npm/@clerk/:path*",
      },
      {
        // Clerk frontend API proxy:
        // Maps /__clerk/* → https://frontend-api.clerk.services/*
        //
        // This proxies Clerk client-side API requests (session, user, etc.) through the
        // main domain, bypassing ad-blockers that block clerk.accounts.dev / clerk.com.
        //
        // frontend-api.clerk.services is Clerk's canonical backend infrastructure —
        // no DNS CNAME setup required (unlike custom domains like clerk.tolo.com).
        //
        // Do NOT include /__clerk in the destination — it would double the prefix.
        source: "/__clerk/:path*",
        destination: "https://frontend-api.clerk.services/:path*",
      },
    ];
  },

  // ─── Webpack fine-tuning ───────────────────────────────────────────────────
  webpack(config, { isServer }) {
    // Fallback for Node.js built-in modules used in client-side bundles
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,   // Prevent webpack from resolving async_hooks on the client
      };
    }



    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "tolo",
  project: "frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: false,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
});


