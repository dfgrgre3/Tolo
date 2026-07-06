import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  turbopack: {
    // Monorepo root so Turbopack can resolve files outside the frontend app
    // (e.g. `d:\thanawy\shared\src` via the @shared/* alias).
    root: path.resolve(__dirname, '..'),
    // Aliases declared only in `webpack()` are ignored by Turbopack,
    // so we must mirror them here for the @shared/* path to resolve.
    resolveAlias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
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
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '**.supabase.in', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  serverExternalPackages: [
    '@prisma/client',
    'ioredis',
    '@bufbuild/protobuf',
    '@connectrpc/connect',
  ],

  outputFileTracingRoot: path.resolve(__dirname, '..'),
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
    const isProduction = process.env.NODE_ENV === 'production';
    const headers = [
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
          {
            // Strict CSP. Sentry + Vercel Insights + Supabase + Cloudflare R2 origins whitelisted.
            // 'unsafe-inline' / 'unsafe-eval' retained for Next.js framework runtime.
            // Tighten further by switching to nonce-based CSP when ready.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.vercel-insights.com https://*.vercel.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https://*.supabase.co https://*.cloudflarestream.com https://*.youtube.com",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.paymob.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.paymob.com",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://*.paymob.com")',
          },
        ],
      },
    ];

    // Only add custom Cache-Control headers for static assets in production
    // In development, these can break Next.js dev server behavior
    if (isProduction) {
      headers.unshift(
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
        }
      );
    }

    return headers;
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  // (add here if needed)

  // ─── Webpack fine-tuning ───────────────────────────────────────────────────
  webpack(config, { isServer }) {
    // @shared alias → ../shared/src
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../shared/src'),
    };

    // Fallback for Node.js built-in modules used in client-side bundles
    if (!isServer) {
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