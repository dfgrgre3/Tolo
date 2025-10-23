
// Performance monitoring configuration
const getPerfConfig = () => {
  const isDevelopment =
    typeof window !== "undefined" ?
      window.location.hostname === "localhost" :
      process.env.NODE_ENV === "development";
  const isProduction = !isDevelopment;

  return {
    // Cache monitoring settings
    cache: {
      // Enable cache hit/miss logging
      logMetrics: isDevelopment,

      // Threshold for logging slow cache operations (in ms)
      slowOperationThreshold: 100,

      // Sample rate for cache metrics (0.0 to 1.0)
      sampleRate: isProduction ? 0.1 : 1.0,
    },

    // API response time monitoring
    api: {
      // Threshold for logging slow API responses (in ms)
      slowRequestThreshold: 1000,

      // Sample rate for API metrics
      sampleRate: isProduction ? 0.1 : 1.0,
    },

    // Database query monitoring
    database: {
      // Threshold for logging slow database queries (in ms)
      slowQueryThreshold: 500,

      // Sample rate for database metrics
      sampleRate: isProduction ? 0.1 : 1.0,
    },

    // Lazy loading settings
    lazyLoading: {
      intersectionObserver: {
        threshold: 0.1,
        rootMargin: "200px"
      },
      // Enable eager loading for priority content
      priorityLoading: {
        enabled: true,
        // Use display: block instead of opacity for better performance
        useDisplayProperty: true
      }
    }
  };
};

// Export as PERF_CONFIG for compatibility
const PERF_CONFIG = getPerfConfig();

// Stub PerfMonitor for compatibility (can be enhanced later)
const PerfMonitor = {
  measure: async (label: string, fn: Function) => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`Performance: ${label} took ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(`Performance error in ${label}: ${error.message} (${duration}ms)`);
      throw error;
    }
  },
  logCacheMetric: (key: string, hit: boolean, duration: number) => {
    // Simple logging - can be enhanced with proper metrics collection
    if (hit) {
      console.log(`Cache hit for ${key}`);
    } else {
      console.log(`Cache miss for ${key}`);
    }
  }
};

// ES module exports
export { getPerfConfig, PERF_CONFIG, PERF_CONFIG as perfConfig, PerfMonitor };
export default PERF_CONFIG;
