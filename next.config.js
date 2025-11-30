/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n configuration removed for App Router compatibility
  // Use next-intl or similar for internationalization with App Router
  // Enable React strict mode for better performance
  reactStrictMode: true,

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
    minimumCacheTTL: 86400, // Cache images for 24 hours
  },

  // Add Turbopack config with HMR improvements
  turbopack: {
    // Improve HMR for icon libraries
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    // Improve chunk loading reliability
    resolveAlias: {
      // Ensure consistent module resolution
    },
  },

  // Improve HMR reliability
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },



  // Enable compression
  compress: true,

  // Remove powered by header for slight performance improvement
  poweredByHeader: false,

  // Enable standalone build for smaller docker images
  output: 'standalone',

  // Server-only packages (not bundled for client)
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
  ],

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
    // Improve chunk loading reliability
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Configure webpack to handle path aliases
  webpack: (config, { dev, isServer }) => {
    // Prevent Node.js modules from being bundled for client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'child_process': false,
      };
    } else {
      // Server-side fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        assert: require.resolve('assert'),
        util: require.resolve('util'),
        stream: require.resolve('stream-browserify')
      };
    }

    // Improved module resolution
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, 'src/')
      },
    };

    // Fix HMR issues with lucide-react and other icon libraries
    if (dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure consistent module resolution for lucide-react during HMR
        'lucide-react': require.resolve('lucide-react'),
      };

      // Improve HMR handling for ES modules and Next.js internals
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        // Improve chunk splitting for better HMR
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate Next.js internals for better HMR
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Separate Next.js client components for better HMR
            nextClient: {
              name: 'next-client',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]next[\\/]dist[\\/]client[\\/]/,
              priority: 30,
              enforce: true,
            },
          },
        },
      };

      // Improve module resolution for Next.js internals
      config.resolve = {
        ...config.resolve,
        // Ensure proper module resolution
        symlinks: false,
        // Fix module resolution for Next.js internals
        alias: {
          ...config.resolve.alias,
        },
      };

      // Configure webpack cache for better HMR
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
      };

      // Add HMR plugin configuration
      if (config.plugins) {
        config.plugins.forEach((plugin) => {
          if (plugin.constructor.name === 'ReactRefreshPlugin') {
            plugin.options = {
              ...plugin.options,
              overlay: false,
            };
          }
        });
      }

      // Improve HMR for Next.js client components
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        aggregateTimeout: 300,
        poll: false,
      };
    }

    // Add error tracking
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
        '__WEBPACK_ERROR_HANDLING__': JSON.stringify(true)
      })
    );

    config.stats = 'verbose';

    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
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

  // Enable browser source map generation only in development
  // Disable in production for better performance and security
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
};

// Enable CDN support conditionally
// When using a CDN, assets will be served from the CDN instead of the origin server
// Only set assetPrefix if CDN_URL is explicitly provided (not empty string)
if (process.env.CDN_URL && process.env.CDN_URL.trim()) {
  nextConfig.assetPrefix = process.env.CDN_URL;
}

module.exports = nextConfig;
