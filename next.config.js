/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better performance
  reactStrictMode: true,
  transpilePackages: ['framer-motion'],

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
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
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
  ],

  // Optimize package imports
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'react-hook-form',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      'chart.js',
      'react-chartjs-2'
    ],
  },

  // Configure webpack to handle path aliases
  webpack: (config, { dev, isServer }) => {
    // Prevent Node.js modules from being bundled for client
    if (!isServer) {
      // Add aliases for node: scheme imports and server-side packages
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:assert': false,
        'node:path': false,
        'node:util': false,
        'node:fs': false,
        '@elastic/elasticsearch': false,
        'winston': false,
        'winston-elasticsearch': false,
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

  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
        ],
      },
    ];
  },

  // Enable ISR revalidation
  staticPageGenerationTimeout: 600,

  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
