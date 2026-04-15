import { logger } from '@/lib/logger';
import { setCircuitBreaker } from '@/lib/metrics/prometheus';

/**
 * Circuit Breaker Pattern - Prevents cascading failures across services
 * 
 * States:
 * - CLOSED: Normal operation. Requests pass through. Failures are counted.
 * - OPEN: Service is considered down. Requests are immediately rejected (fail-fast).
 * - HALF_OPEN: After a cooldown, a single probe request is allowed to test recovery.
 *
 * Architecture Goal: Protect DB, Redis, and external APIs from avalanche failures
 * when one dependency goes down under load from millions of users.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Name of the service being protected (for logging) */
  name: string;
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN */
  cooldownMs: number;
  /** Timeout in ms for the protected operation */
  timeoutMs: number;
  /** Number of successful probe requests needed to close the circuit from HALF_OPEN */
  successThreshold?: number;
  /** Custom function to determine if an error should count as a failure */
  isFailure?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Partial<CircuitBreakerOptions> = {
  failureThreshold: 5,
  cooldownMs: 30_000,   // 30 seconds
  timeoutMs: 10_000,    // 10 seconds
  successThreshold: 2,
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      isFailure: () => true,
      ...options,
    } as Required<CircuitBreakerOptions>;
  }

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.cooldownMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        // Fast fail
        logger.warn(`[CircuitBreaker:${this.options.name}] OPEN - rejecting request`);
        if (fallback) return fallback();
        throw new CircuitBreakerError(`Service ${this.options.name} is unavailable (circuit OPEN)`);
      }
    }

    try {
      // Execute with timeout
      const result = await this.withTimeout(fn(), this.options.timeoutMs);
      this.onSuccess();
      return result;
    } catch (error) {
      if (this.options.isFailure(error)) {
        this.onFailure();
      }
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately reopens
      this.transitionTo(CircuitState.OPEN);
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      setCircuitBreaker(this.options.name, 'closed');
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      setCircuitBreaker(this.options.name, 'half-open');
    } else if (newState === CircuitState.OPEN) {
      setCircuitBreaker(this.options.name, 'open');
    }

    logger.info(`[CircuitBreaker:${this.options.name}] ${oldState} → ${newState}`);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[CircuitBreaker:${this.options.name}] Operation timed out after ${ms}ms`));
      }, ms);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /** Force-reset the circuit (for admin/ops use) */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  getStats() {
    return {
      name: this.options.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ─── Pre-configured Singleton Instances ───

/** Database circuit breaker - strict thresholds */
export const dbCircuitBreaker = new CircuitBreaker({
  name: 'PostgreSQL',
  failureThreshold: 5,
  cooldownMs: 30_000,
  timeoutMs: 15_000,
  successThreshold: 3,
  isFailure: (err: unknown) => {
    // Only count actual connection/timeout errors, not query validation errors
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('connection') ||
      msg.includes('timeout') ||
      msg.includes('pool') ||
      msg.includes('P1001') || // Prisma: Can't reach database
      msg.includes('P1002') || // Prisma: Database timeout
      msg.includes('P1008') || // Prisma: Operations timed out
      msg.includes('P1017')    // Prisma: Server closed connection
    );
  },
});

/** Redis circuit breaker - more lenient since we have memory fallback */
export const redisCircuitBreaker = new CircuitBreaker({
  name: 'Redis',
  failureThreshold: 5,
  cooldownMs: 30_000,
  timeoutMs: 3_000,
  successThreshold: 3,
});

/** External API circuit breaker (Paymob, OpenAI, etc.) */
export const externalApiCircuitBreaker = new CircuitBreaker({
  name: 'ExternalAPI',
  failureThreshold: 3,
  cooldownMs: 60_000,
  timeoutMs: 30_000,
  successThreshold: 2,
});

export default CircuitBreaker;
