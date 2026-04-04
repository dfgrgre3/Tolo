// Performance monitoring configuration
import { logger } from '@/lib/logger';

// Lazy load logger to prevent server-side bundling issues
// This file must be safe for both client and server execution

// Define logger interface type
interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

// Initialize logger instance safely
// Never initialize on client side to prevent bundling issues
let loggerInstance: Logger | null = null;

// Create a console-based logger for client-side use
const createConsoleLogger = () => ({
  info: (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.info) {
      logger.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.warn) {
      logger.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.error) {
      logger.error(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.debug) {
      logger.debug(...args);
    }
  },
});

async function getLogger(): Promise<Logger> {
  // Always use console logger on client side to avoid bundling server-only code
  // This prevents the bundler from trying to include server-only dependencies
  const isClient = typeof window !== 'undefined';

  if (isClient) {
    // On client, always return console logger immediately
    return createConsoleLogger();
  }

  // Server-side only: lazy load the actual logger
  if (!loggerInstance) {
    try {
      // Build the import path dynamically to prevent bundler from analyzing it
      // This ensures the logger module is never bundled for the client
      const loggerPath = '@' + '/lib/' + 'logger';
      const loggerModule = await import(loggerPath);
      loggerInstance = loggerModule.logger || loggerModule.default || createConsoleLogger();
    } catch (error) {
      // Fallback to console if logger fails to load
      loggerInstance = createConsoleLogger();
    }
  }

  return loggerInstance || createConsoleLogger();
}

const getPerfConfig = () => {
  // Safe check for development mode that works on both client and server
  let isDevelopment = false;
  try {
    // Check if we're on the client side
    const isClient = typeof window !== "undefined";

    if (isClient && typeof window.location !== "undefined") {
      // Client-side: check hostname
      isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    } else if (!isClient) {
      // Server-side only: safely access process.env
      // Wrap in try-catch and check each level separately
      try {
        const proc = typeof process !== "undefined" ? process : null;
        if (proc && proc.env && typeof proc.env === "object") {
          const nodeEnv = proc.env.NODE_ENV;
          isDevelopment = nodeEnv === "development";
        }
      } catch {
        // If process.env access fails, default to false
        isDevelopment = false;
      }
    }
  } catch (error) {
    // Fallback to false if any error occurs
    isDevelopment = false;
  }
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
// Safe initialization with error handling
let PERF_CONFIG: ReturnType<typeof getPerfConfig>;
try {
  PERF_CONFIG = getPerfConfig();
} catch (error) {
  // Fallback config if initialization fails (e.g., during client-side bundling)
  PERF_CONFIG = {
    cache: { logMetrics: false, slowOperationThreshold: 100, sampleRate: 0.1 },
    api: { slowRequestThreshold: 1000, sampleRate: 0.1 },
    database: { slowQueryThreshold: 500, sampleRate: 0.1 },
    lazyLoading: {
      intersectionObserver: { threshold: 0.1, rootMargin: "200px" },
      priorityLoading: { enabled: true, useDisplayProperty: true }
    }
  };
}

// Stub PerfMonitor for compatibility (can be enhanced later)
const PerfMonitor = {
  measure: async <T>(label: string, fn: () => Promise<T> | T): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      const logger = await getLogger();
      logger.info(`Performance: ${label} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const logger = await getLogger();
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Performance error in ${label}: ${normalizedError.message} (${duration}ms)`);
      throw normalizedError;
    }
  },
  logCacheMetric: async (key: string, hit: boolean, duration: number) => {
    // Simple logging - can be enhanced with proper metrics collection
    const logger = await getLogger();
    if (hit) {
      logger.info(`Cache hit for ${key}`);
    } else {
      logger.info(`Cache miss for ${key}`);
    }
  }
};

// ES module exports
export { getPerfConfig, PERF_CONFIG, PERF_CONFIG as perfConfig, PerfMonitor };
export default PERF_CONFIG;
