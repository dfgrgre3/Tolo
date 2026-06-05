/** @type {import('next').NextConfig} */
const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // NOTE: Do NOT use output: 'standalone' on Vercel — it is only for
  // Docker/self-hosted Node deployments. Using it on Vercel causes static
  // pages (/about, /contact, /pathways, /privacy) to return 404.
  // reactStrictMode for better devex
  reactStrictMode: true,
  turbopack: {
    root: path.join(__dirname, '..'),
  },

  compiler: {
    // In production: strip ALL console.* except error and warn
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize CSS in production
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production',
    optimizePackageImports: [
      'react-hook-form',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'zod',
      '@tanstack/react-table',
      'sonner',
      'clsx',
      'tailwind-merge',
      'uuid',
      'lodash',
      'axios',
      'lucide-react',
      'framer-motion',
      '@vercel/analytics',
      '@vercel/speed-insights',
      'chart.js',
      'react-chartjs-2',
    ],
    proxyClientMaxBodySize: '35mb',
    scrollRestoration: true,
  },

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: process.env.ALLOW_SVG === 'true',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Performance optimizations
    unoptimized: process.env.NODE_ENV === 'development',
  },


  // Enable compression
  compress: true,

  // NOTE: /api/* requests are handled by the Next.js catch-all route at
  // src/app/api/[...path]/route.ts which proxies to the backend.
  // We do NOT add rewrites for /api/* or /uploads/* here — all media must be
  // served from Supabase Storage CDN (stateless cloud architecture).
  // Local /uploads paths are NOT supported in production.

  // Remove powered by header
  poweredByHeader: false,


  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 20,
  },

  // Configure webpack to handle path aliases
  webpack: (config, { dev, isServer, nextRuntime }) => {
    // Prevent Node.js modules from being bundled for client or Edge
    if (!isServer || nextRuntime === 'edge') {
      // Add aliases for node: scheme imports and server-side packages
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:assert': false,
        'node:path': false,
        'node:util': false,
        'node:fs': false,
        'node:console': false,
        'node:crypto': false,
        'node:diagnostics_channel': false,
        'node:dns': false,
        'node:https': false,
        'async_hooks': false,
        'node:async_hooks': false,
        'node:buffer': false,
        'winston': false,
        '@elastic/elasticsearch': false,
      };
    } else {
      // Server-side alias
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/clerk-nextjs/**', '**/backend/**'],
        aggregateTimeout: 300,
        poll: false,
      };
    }

    config.performance = {
      hints: 'warning',
      // Tighter limits encourage smaller bundles — better for mobile/slow devices
      maxEntrypointSize: 200000,
      maxAssetSize: 200000,
    };

    if (!dev) {
      config.optimization.minimize = true;
    }

    return config;
  },

  // Configure headers for better caching (production only to avoid dev issues)
  async headers() {
    // Only apply custom headers in production to avoid breaking dev mode
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }

    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com https://*.accounts.dev https://clerk.com https://*.clerk.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' https: data: blob: https://img.clerk.com https://clerk.com https://*.clerk.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://*.tolo.app https://*.vercel.app wss: ws: http://127.0.0.1:* https://*.accounts.dev https://clerk.com https://*.clerk.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.accounts.dev https://clerk.com",
              "frame-ancestors 'none'",
              "media-src 'self' https: blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.accounts.dev",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Exclude external Next.js projects nested in the root from being scanned
  outputFileTracingExcludes: {
    '*': [
      './clerk-nextjs/**',
      './backend/**',
    ],
  },

  // Enable ISR revalidation
  staticPageGenerationTimeout: 600,

  productionBrowserSourceMaps: false,
};

// Add allowed origin for remote development HMR
nextConfig.allowedDevOrigins = [process.env.ALLOWED_DEV_ORIGIN, 'localhost'].filter(Boolean);

module.exports = withBundleAnalyzer(nextConfig);
