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
  // ملاحظة: في وضع التطوير يتم تعطيله لأن `outputFileTracingRoot` المرتبط
  // به يجبر Next.js على مسح كامل شجرة الـ monorepo في كل تحميل للإعدادات،
  // مما يطيل زمن "Loading next.config.js" من ثوانٍ إلى دقائق.
  output: isDev ? undefined : 'standalone',
  reactStrictMode: true,
  // SECURITY: never publish public .map files alongside the client bundle.
  // Source maps are uploaded privately to Sentry via SENTRY_AUTH_TOKEN
  // (configured in the withSentryConfig call below). Public exposure would
  // let anyone reconstruct the original source — including any string that
  // happened to land in a bundle, comments, route paths, etc.
  productionBrowserSourceMaps: false,
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
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/thanawy/uploads/**' },
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
  ],

  // `outputFileTracingRoot` مطلوب فقط في الإنتاج لـ `output: 'standalone'`.
  // في التطوير يُكلّف Next.js بمسح كامل شجرة الـ monorepo في كل تحميل
  // للإعدادات — نعطّله لتسريع الإقلاع من دقيقتين إلى ثوانٍ.
  ...(isDev ? {} : { outputFileTracingRoot: path.resolve(__dirname, '..') }),
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
          // Cross-Origin-Opener-Policy: same-origin — isolates the browsing
          // context from cross-origin windows that open us via window.open
          // (e.g. payment iframes from Paymob). Without this, a malicious
          // opener could synchronously access window.opener on the payment
          // page via a postMessage attack. `same-origin` permits iframes
          // from the same origin only, which is what we want for payment
          // flows (Paymob runs in its own iframe context, not as a same
          // window).
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Cross-Origin-Resource-Policy: same-origin — tells browsers to
          // refuse to load any of our static assets as cross-origin
          // resources (e.g. <img src=...> from a third-party site).
          // Defense against side-channel attacks that use cross-origin
          // resource timing.
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Permissions-Policy: explicit denials for features the app
          // does not use. Anything not listed here is implicitly allowed
          // by the browser, so a missing entry is a permissive default.
          // Keep this in sync with any feature the app adds.
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=(self)',
              'payment=(self "https://*.paymob.com")',
              // Modern APIs that the app does not use but the browser
              // exposes by default.
              'usb=()',
              'serial=()',
              'bluetooth=()',
              'midi=()',
              'hid=()',
              'accelerometer=()',
              'gyroscope=()',
              'magnetometer=()',
              'autoplay=()',
              'encrypted-media=()',
              'picture-in-picture=()',
              'screen-wake-lock=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          // SECURITY: Content-Security-Policy is intentionally NOT set here.
          // The single source of truth is the Edge middleware in
          // src/proxy.ts (which delegates to src/lib/security/csp.ts).
          // Defining CSP in both next.config.js and the middleware caused
          // a duplicated policy where the intersection of the two sources
          // applied — e.g. payment iframe breaks because the static
          // frame-src lacked Paymob. Keeping one policy avoids the
          // accidental intersection and ensures the nonce injected by the
          // middleware is the only script-src key the browser enforces.
        ],
      },
      // API responses — minimal but non-negotiable security headers.
      // The HTML route above excludes `/api/*` (see the negative
      // lookahead in its source pattern) so these routes need their own
      // block. CSP is NOT applied here: API responses are never
      // rendered as documents, only consumed by fetch, so the runtime
      // nonce in src/proxy.ts is unnecessary and would be a leak.
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Block API responses from being embedded as iframes — the
          // browser will refuse to render a JSON body in a frame, but
          // X-Frame-Options: DENY also defends against clickjacking on
          // any HTML wrapper that might proxy the response.
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Cross-Origin-Resource-Policy for API: `same-origin` would
          // break the SW which reads /api/* on first load from its own
          // origin, so we use `same-site` to allow the SW + the page
          // origin to fetch each other, while still blocking unrelated
          // third-party origins from embedding API responses as
          // resources.
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-site',
          },
          // Mark every API response as varying on Origin so the browser
          // does not cache a response from user A and serve it to user
          // B's request from a shared CDN. Combined with the
          // `Cache-Control: no-store` set by individual route handlers
          // for sensitive endpoints, this prevents response mix-up.
          {
            key: 'Vary',
            value: 'Origin',
          },
        ],
      },
    ];

    // Caching for static assets is managed natively by Next.js and Vercel/CDNs.
    // Custom overrides are omitted to avoid configuration clashes.

    return headers;
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  // Keep legacy / aliased paths working so deep-linked tests and bookmarks
  // (e.g. /auth/login, /contacts) resolve to the canonical routes instead of
  // returning 404/502 at the edge.
  async redirects() {
    return [
      // Auth lives at /login (route group (auth) is a non-routing group).
      {
        source: "/auth/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/auth/login/:path*",
        destination: "/login/:path*",
        permanent: false,
      },
      // The "contacts directory" (people/teachers directory) lives at
      // /teachers (the (education) route group does NOT appear in the URL —
      // /education/teachers was a 404). Alias /contacts there so directory
      // links resolve.
      {
        source: "/contacts",
        destination: "/teachers",
        permanent: false,
      },
      {
        source: "/contacts/:path*",
        destination: "/teachers/:path*",
        permanent: false,
      },
      // The teacher app lives at /teaching. Legacy/internal links point at
      // /teach — alias it so existing links resolve on a single canonical
      // URL (also lets Footer's startsWith("/teaching") hide rule work).
      {
        source: "/teach",
        destination: "/teaching",
        permanent: false,
      },
      // The bundled-package / promotion claim flow lives on the billing
      // page's "plans" tab. Alias /plans there so the plans entry point
      // and any bookmarked/deep links resolve instead of 404ing.
      {
        source: "/plans",
        destination: "/billing?tab=upgrade",
        permanent: false,
      },
      {
        source: "/plans/:path*",
        destination: "/billing?tab=upgrade",
        permanent: false,
      },
    ];
  },

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