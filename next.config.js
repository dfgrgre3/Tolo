/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  output: 'standalone',
  // Enable React strict mode for better performance
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Skip type checking during build (run separately in CI)
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
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
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Performance optimizations
    unoptimized: process.env.NODE_ENV === 'development', // Skip optimization in dev for speed
  },

  // Enable compression
  compress: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace('/api', '')}/uploads/:path*`,
      },
    ];
  },

  // Remove powered by header
  poweredByHeader: false,

  // Optimize package imports - reduces bundle size significantly
  experimental: {
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
      'chart.js',
      'react-chartjs-2',
      'recharts',
      'date-fns',
      'zod',
      '@tanstack/react-table',
      'sonner',
      'clsx',
      'tailwind-merge',
      'uuid',
      'lodash',
      'axios'
    ],
    proxyClientMaxBodySize: '35mb',
    scrollRestoration: true,
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
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        aggregateTimeout: 300,
        poll: false,
      };
    }

    config.performance = {
      hints: false,
      maxEntrypointSize: 300000,
      maxAssetSize: 300000,
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
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
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
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  // Enable ISR revalidation
  staticPageGenerationTimeout: 600,

  productionBrowserSourceMaps: false,
};

// Add allowed origin for remote development HMR
nextConfig.allowedDevOrigins = ['192.168.1.15', 'localhost'];

module.exports = withBundleAnalyzer(nextConfig);