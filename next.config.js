/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  output: 'standalone',
  // Enable React strict mode for better performance
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['framer-motion', 'three'],

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Turbopack configuration
  turbopack: {},

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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enable compression
  compress: true,

  // Remove powered by header
  poweredByHeader: false,

  // Server-side packages that should not be bundled
  serverExternalPackages: [
    'winston',
    'winston-elasticsearch',
    '@elastic/elasticsearch',
    'tailwindcss',
    '@nodelib/fs.scandir',
    '@nodelib/fs.walk',
    'fast-glob',
    'import-in-the-middle',
    'require-in-the-middle',
    '@prisma/instrumentation',
    'prom-client',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/instrumentation',
    '@opentelemetry/instrumentation-http',
    '@opentelemetry/instrumentation-express',
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/api',
    'bcrypt',
    'ioredis',
    'nodemailer',
    'openai',
    'twilio',
    '@prisma/client',
    'bullmq',
  ],

  // Optimize package imports - reduces bundle size significantly
  experimental: {
    optimizePackageImports: [
      'lucide-react',
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
      'framer-motion',
      'three',
      '@react-three/fiber',
      '@react-three/drei'
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
        '@elastic/elasticsearch': false,
        'winston': false,
        'winston-elasticsearch': false,
        'undici': false,
        'ioredis': false,
        'redis-errors': false,
        'bullmq': false,
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
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
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
