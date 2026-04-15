import { logger } from "@/lib/logger";
import { CircuitBreaker, CircuitBreakerOptions } from "@/lib/circuit-breaker";
import { AppError } from "@/lib/error-handler";
import { ERROR_CODES } from "@/lib/error-codes";

/**
 * BaseService - Core infrastructure for all business logic services.
 * Features:
 * 1. Built-in Circuit Breaker protection.
 * 2. Standardized error normalization.
 * 3. Consistent logging with performance tracking.
 * 4. Resource isolation.
 */
export abstract class BaseService {
  protected readonly circuitBreaker: CircuitBreaker | null = null;
  protected readonly serviceName: string;

  constructor(
    serviceName: string,
    circuitOptions?: Partial<CircuitBreakerOptions>,
  ) {
    this.serviceName = serviceName;

    if (circuitOptions) {
      this.circuitBreaker = new CircuitBreaker({
        name: serviceName,
        failureThreshold: 5,
        cooldownMs: 30000,
        timeoutMs: 10000,
        ...circuitOptions,
      });
    }
  }

  /**
   * Run a service operation with protection and logging.
   */
  protected async runProtected<T>(
    operationName: string,
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    const start = Date.now();

    try {
      let result: T;

      if (this.circuitBreaker) {
        result = await this.circuitBreaker.execute(operation, fallback);
      } else {
        result = await operation();
      }

      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn(
          `[${this.serviceName}] Slow operation: ${operationName} took ${duration}ms`,
        );
      }

      return result;
    } catch (error) {
      return this.handleServiceError(operationName, error);
    }
  }

  /**
   * Standardized error handler for services.
   */
  protected handleServiceError(operationName: string, error: unknown): never {
    const duration = 0; // Placeholder

    if (error instanceof AppError) {
      logger.error(
        `[${this.serviceName}] ${operationName} failed: ${error.message}`,
        { code: error.code },
      );
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `[${this.serviceName}] UNEXPECTED ERROR in ${operationName}: ${message}`,
      { error },
    );

    throw new AppError(
      `Service error in ${this.serviceName}:${operationName}`,
      500,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
}
