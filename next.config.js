/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n configuration removed for App Router compatibility
  // Use next-intl or similar for internationalization with App Router
  // Enable React strict mode for better performance
  reactStrictMode: true,

  // Optimize images
  images: {
    domains: ['youtube.com', 'i.ytimg.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // Cache images for 24 hours
  },

  // Enable compression
  compress: true,

  // Remove powered by header for slight performance improvement
  poweredByHeader: false,

  // Enable standalone build for smaller docker images
  output: 'standalone',

  // Optimize static assets
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'react-hook-form',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      'chart.js',
      'react-chartjs-2'
    ],
    // Enable webpack 5 for better performance
    webpackBuildWorker: true,
  },

  // Configure webpack to handle path aliases
  webpack: (config, { dev }) => {
    // Add alias for hydration-fix
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src/'),
    };

    // Only add basic optimizations
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
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/assets/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000', // 30 days
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=2592000',
          }
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

  // Enable CDN support
  // When using a CDN, assets will be served from the CDN instead of the origin server
  assetPrefix: process.env.CDN_URL || '',

  // Enable browser source map generation for better debugging
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
