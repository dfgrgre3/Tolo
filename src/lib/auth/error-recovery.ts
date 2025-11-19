/**
 * Error Recovery System
 * نظام استعادة الأخطاء التلقائي
 * 
 * يوفر:
 * - استعادة تلقائية من أخطاء الشبكة
 * - إعادة المحاولة التلقائية
 * - معالجة ذكية للأخطاء
 * - تسجيل وتحليل الأخطاء
 */

import { logger } from '@/lib/logger';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface ErrorContext {
  operation: string;
  error: Error | any;
  attempt: number;
  maxRetries: number;
}

class ErrorRecoveryManager {
  private errorHistory: Map<string, number> = new Map();
  private readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],
  };

  /**
   * التحقق من إمكانية إعادة المحاولة
   */
  isRetryable(error: Error | any, retryableErrors?: string[]): boolean {
    const errors = retryableErrors || this.DEFAULT_OPTIONS.retryableErrors;
    
    // التحقق من نوع الخطأ
    if (error?.code && errors.includes(error.code)) {
      return true;
    }

    // التحقق من رسالة الخطأ
    const errorMessage = error?.message || String(error);
    if (errors.some(code => errorMessage.includes(code))) {
      return true;
    }

    // التحقق من أخطاء الشبكة العامة
    if (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('network')
    ) {
      return true;
    }

    return false;
  }

  /**
   * حساب تأخير إعادة المحاولة
   */
  calculateRetryDelay(attempt: number, baseDelay: number, multiplier: number): number {
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * إعادة المحاولة مع تأخير متزايد
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | any;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // نجحت العملية - مسح تاريخ الأخطاء
        this.clearErrorHistory(operation.name);
        
        return result;
      } catch (error: any) {
        lastError = error;

        // التحقق من إمكانية إعادة المحاولة
        if (!this.isRetryable(error, opts.retryableErrors)) {
          logger.warn('Non-retryable error:', error);
          throw error;
        }

        // التحقق من عدد المحاولات
        if (attempt >= opts.maxRetries) {
          logger.error(`Max retries (${opts.maxRetries}) reached for operation:`, operation.name);
          this.recordError(operation.name);
          throw error;
        }

        // حساب التأخير
        const delay = this.calculateRetryDelay(
          attempt,
          opts.retryDelay,
          opts.backoffMultiplier
        );

        logger.warn(
          `Operation failed (attempt ${attempt}/${opts.maxRetries}), retrying in ${delay}ms:`,
          operation.name
        );

        // انتظار قبل إعادة المحاولة
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * تسجيل خطأ
   */
  private recordError(operation: string) {
    const count = this.errorHistory.get(operation) || 0;
    this.errorHistory.set(operation, count + 1);
  }

  /**
   * مسح تاريخ الأخطاء
   */
  private clearErrorHistory(operation: string) {
    this.errorHistory.delete(operation);
  }

  /**
   * الحصول على عدد الأخطاء
   */
  getErrorCount(operation: string): number {
    return this.errorHistory.get(operation) || 0;
  }

  /**
   * انتظار
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * معالجة خطأ المصادقة
   */
  async handleAuthError(error: Error | any, context: ErrorContext): Promise<boolean> {
    // تسجيل الخطأ
    logger.error('Auth error:', {
      operation: context.operation,
      error: error?.message || String(error),
      attempt: context.attempt,
    });

    // التحقق من نوع الخطأ
    if (error?.code === 'UNAUTHORIZED' || error?.status === 401) {
      // انتهت الجلسة - لا نحاول إعادة المحاولة
      return false;
    }

    if (error?.code === 'FORBIDDEN' || error?.status === 403) {
      // ليس لديه صلاحية - لا نحاول إعادة المحاولة
      return false;
    }

    // أخطاء الشبكة - يمكن إعادة المحاولة
    if (this.isRetryable(error)) {
      return context.attempt < context.maxRetries;
    }

    return false;
  }

  /**
   * استعادة من خطأ الشبكة
   */
  async recoverFromNetworkError<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.retryWithBackoff(operation, {
      ...options,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'Failed to fetch',
        'NetworkError',
      ],
    });
  }

  /**
   * استعادة من خطأ المصادقة
   */
  async recoverFromAuthError<T>(
    operation: () => Promise<T>,
    onUnauthorized?: () => void
  ): Promise<T | null> {
    try {
      return await this.retryWithBackoff(operation, {
        maxRetries: 2,
        retryDelay: 500,
      });
    } catch (error: any) {
      if (error?.code === 'UNAUTHORIZED' || error?.status === 401) {
        onUnauthorized?.();
        return null;
      }
      throw error;
    }
  }
}

// Singleton instance
let recoveryManagerInstance: ErrorRecoveryManager | null = null;

export function getErrorRecoveryManager(): ErrorRecoveryManager {
  if (!recoveryManagerInstance) {
    recoveryManagerInstance = new ErrorRecoveryManager();
  }
  return recoveryManagerInstance;
}

export default getErrorRecoveryManager;

