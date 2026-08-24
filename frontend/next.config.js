import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  turbopack: {
    // Monorepo root so Turbopack can resolve files outside the frontend app
    root: path.resolve(__dirname, '..'),
  },
  // ─── Basics ────────────────────────────────────────────────────────────────
  // 'standalone' يُخرج خادماً مستقلاً (.next/standalone) يحوي فقط الاعتمادات
  // اللازمة لوقت التشغيل — يجعل صورة Docker صغيرة وسريعة الإقلاع.
  output: 'standalone',
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  compress: true,           // gzip/brotli at the Next.js edge
  poweredByHeader: false,   // remove X-Powered-By header (minor security + bytes)
  transpilePackages: ["@thanawy/shared"],

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
          // ─── Content Security Policy ─────────────────────────────────────────
          // Provides defence-in-depth against XSS. Next.js generates inline
          // scripts during hydration so 'unsafe-inline' is required for scripts
          // until a nonce-based middleware approach is adopted. However, all
          // script *sources* are tightly allow-listed, limiting injection vectors
          // significantly compared to having no CSP at all.
          //
          // ROADMAP: migrate to nonce-based CSP (middleware.ts nonce injection)
          // to eliminate 'unsafe-inline' for scripts entirely.
          {
            key: 'Content-Security-Policy',
            value: [
              // Only load scripts from known-safe origins
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.youtube-nocookie.com https://cdn.jsdelivr.net https://js.sentry-cdn.com https://*.sentry.io https://*.vercel-insights.com https://*.vercel.com https://va.vercel-scripts.com",
              // Styles: self + Google Fonts + inline (required by Tailwind/CSS-in-JS)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts from Google Fonts CDN + Perplexity CDN
              "font-src 'self' data: https://fonts.gstatic.com https://frontend-cdn.perplexity.ai",
              // Images: self + Supabase CDN + YouTube thumbnails + Google avatars + DiceBear
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://i.ytimg.com https://lh3.googleusercontent.com https://api.dicebear.com",
              // Iframes: YouTube embeds only
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
              // API, Supabase realtime, Sentry, Vercel Analytics
              "connect-src 'self' http://localhost:8082 ws://localhost:8082 ws: wss://*.supabase.co https://*.supabase.co https://*.supabase.in https://sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://*.ingest.sentry.io https://va.vercel-scripts.com",
              // Video/audio: self + Supabase storage + Bunny + Cloudflare Stream
              "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://cdn.bunny.net https://*.b-cdn.net https://stream.cloudflare.com",
              // Service worker and Web Workers
              "worker-src 'self' blob:",
              // Block <object>, <embed>, <applet> — legacy plugin vectors
              "object-src 'none'",
              // Restrict <base href> to same origin
              "base-uri 'self'",
              // Form submissions to same origin only
              "form-action 'self'",
              // Fallback for any unspecified fetch directives
              "default-src 'self'",
            ].join('; '),
          },
        ],
      },
    ];

    // Caching for static assets is managed natively by Next.js and Vercel/CDNs.
    // Custom overrides are omitted to avoid configuration clashes.

    return headers;
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  // (add here if needed)

  // ─── Webpack fine-tuning ───────────────────────────────────────────────────
  webpack(config, { isServer }) {
    config.resolve = config.resolve || {};

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

// Sentry يضيف طبقة instrumentation ثقيلة على كل وحدة أثناء التصريف.
// في وضع التطوير لا فائدة منها، وتكلفتها في زمن التصريف كبيرة.
export default isDev
  ? nextConfig
  : withSentryConfig(nextConfig, {
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