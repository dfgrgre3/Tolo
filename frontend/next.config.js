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

export default nextConfig;
