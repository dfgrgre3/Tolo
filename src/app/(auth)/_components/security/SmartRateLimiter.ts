/**
 * Smart Rate Limiting System with Machine Learning
 * Adaptive rate limiting based on user behavior patterns
 */

import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in window
  blockDurationMs: number; // Block duration after exceeding limit
}

export interface RateLimitEntry {
  identifier: string;
  attempts: number[];
  blockedUntil: Date | null;
  trustScore: number; // 0-100, higher is more trusted
  behaviorPattern: BehaviorPattern;
  metadata?: Record<string, unknown>;
}

export interface BehaviorPattern {
  averageInterval: number; // Average time between attempts
  variance: number; // Variance in timing
  timeOfDayPattern: number[]; // Activity by hour (0-23)
  dayOfWeekPattern: number[]; // Activity by day (0-6)
  successRate: number; // Percentage of successful attempts
  anomalyScore: number; // 0-100, higher is more anomalous
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  blockedUntil?: Date;
  trustScore: number;
  reason?: string;
}

export class SmartRateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private readonly storageKey = 'rate_limit_entries';
  private readonly cleanupInterval = 60000; // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Default configurations for different trust levels
  private readonly configs = {
    untrusted: {
      windowMs: 60000, // 1 minute
      maxAttempts: 3,
      blockDurationMs: 300000, // 5 minutes
    },
    low: {
      windowMs: 60000,
      maxAttempts: 5,
      blockDurationMs: 180000, // 3 minutes
    },
    medium: {
      windowMs: 60000,
      maxAttempts: 10,
      blockDurationMs: 60000, // 1 minute
    },
    high: {
      windowMs: 60000,
      maxAttempts: 20,
      blockDurationMs: 30000, // 30 seconds
    },
    trusted: {
      windowMs: 60000,
      maxAttempts: 50,
      blockDurationMs: 10000, // 10 seconds
    },
  };

  constructor() {
    this.loadFromStorage();
    this.startCleanup();
  }

  /**
   * Check if an attempt is allowed
   */
  checkLimit(identifier: string, context?: Record<string, unknown>): RateLimitResult {
    const entry = this.getOrCreateEntry(identifier);

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > new Date()) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.blockedUntil,
        blockedUntil: entry.blockedUntil,
        trustScore: entry.trustScore,
        reason: 'تم حظرك مؤقتاً بسبب تجاوز عدد المحاولات المسموح بها',
      };
    }

    // Get config based on trust score
    const config = this.getConfigForTrustScore(entry.trustScore);

    // Clean old attempts outside the window
    const now = Date.now();
    const windowStart = now - config.windowMs;
    entry.attempts = entry.attempts.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (entry.attempts.length >= config.maxAttempts) {
      // Apply ML-based anomaly detection
      const anomalyScore = this.calculateAnomalyScore(entry, context);

      // If anomaly score is high, apply stricter blocking
      const blockMultiplier = anomalyScore > 70 ? 3 : anomalyScore > 50 ? 2 : 1;
      const blockDuration = config.blockDurationMs * blockMultiplier;

      entry.blockedUntil = new Date(now + blockDuration);
      this.saveToStorage();

      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.blockedUntil,
        blockedUntil: entry.blockedUntil,
        trustScore: entry.trustScore,
        reason: anomalyScore > 70
          ? 'تم اكتشاف نشاط مشبوه. تم حظرك مؤقتاً.'
          : 'تجاوزت عدد المحاولات المسموح بها',
      };
    }

    // Record attempt
    entry.attempts.push(now);
    this.updateBehaviorPattern(entry);
    this.saveToStorage();

    const remainingAttempts = config.maxAttempts - entry.attempts.length;
    const resetTime = new Date(windowStart + config.windowMs);

    return {
      allowed: true,
      remainingAttempts,
      resetTime,
      trustScore: entry.trustScore,
    };
  }

  /**
   * Record a successful attempt
   */
  recordSuccess(identifier: string): void {
    const entry = this.getOrCreateEntry(identifier);

    // Increase trust score on success
    entry.trustScore = Math.min(100, entry.trustScore + 2);

    // Update behavior pattern
    this.updateBehaviorPattern(entry);
    this.saveToStorage();
  }

  /**
   * Record a failed attempt
   */
  recordFailure(identifier: string): void {
    const entry = this.getOrCreateEntry(identifier);

    // Decrease trust score on failure
    entry.trustScore = Math.max(0, entry.trustScore - 5);

    // Update behavior pattern
    this.updateBehaviorPattern(entry);
    this.saveToStorage();
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.entries.delete(identifier);
    this.saveToStorage();
  }

  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string): RateLimitEntry | null {
    return this.entries.get(identifier) || null;
  }

  /**
   * Manually adjust trust score
   */
  adjustTrustScore(identifier: string, delta: number): void {
    const entry = this.getOrCreateEntry(identifier);
    entry.trustScore = Math.max(0, Math.min(100, entry.trustScore + delta));
    this.saveToStorage();
  }

  /**
   * Get trust level name
   */
  getTrustLevel(trustScore: number): string {
    if (trustScore >= 80) return 'trusted';
    if (trustScore >= 60) return 'high';
    if (trustScore >= 40) return 'medium';
    if (trustScore >= 20) return 'low';
    return 'untrusted';
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [identifier, entry] of this.entries.entries()) {
      // Remove if no recent activity
      if (entry.attempts.length === 0) {
        this.entries.delete(identifier);
        continue;
      }

      const lastAttempt = Math.max(...entry.attempts);
      if (now - lastAttempt > maxAge) {
        this.entries.delete(identifier);
      }
    }

    this.saveToStorage();
  }

  // Private methods

  private getOrCreateEntry(identifier: string): RateLimitEntry {
    let entry = this.entries.get(identifier);

    if (!entry) {
      entry = {
        identifier,
        attempts: [],
        blockedUntil: null,
        trustScore: 50, // Start with medium trust
        behaviorPattern: {
          averageInterval: 0,
          variance: 0,
          timeOfDayPattern: new Array(24).fill(0),
          dayOfWeekPattern: new Array(7).fill(0),
          successRate: 0,
          anomalyScore: 0,
        },
      };
      this.entries.set(identifier, entry);
    }

    return entry;
  }

  private getConfigForTrustScore(trustScore: number): RateLimitConfig {
    const level = this.getTrustLevel(trustScore);
    return this.configs[level as keyof typeof this.configs];
  }

  private updateBehaviorPattern(entry: RateLimitEntry): void {
    if (entry.attempts.length < 2) return;

    // Calculate average interval
    const intervals: number[] = [];
    for (let i = 1; i < entry.attempts.length; i++) {
      intervals.push(entry.attempts[i] - entry.attempts[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    entry.behaviorPattern.averageInterval = avgInterval;

    // Calculate variance
    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
      intervals.length;
    entry.behaviorPattern.variance = variance;

    // Update time of day pattern
    const now = new Date();
    const hour = now.getHours();
    entry.behaviorPattern.timeOfDayPattern[hour]++;

    // Update day of week pattern
    const dayOfWeek = now.getDay();
    entry.behaviorPattern.dayOfWeekPattern[dayOfWeek]++;
  }

  private calculateAnomalyScore(
    entry: RateLimitEntry,
    context?: Record<string, unknown>
  ): number {
    let anomalyScore = 0;

    // Check for rapid-fire attempts (very low interval)
    if (entry.behaviorPattern.averageInterval < 1000) {
      anomalyScore += 30;
    } else if (entry.behaviorPattern.averageInterval < 5000) {
      anomalyScore += 15;
    }

    // Check for high variance (inconsistent timing)
    if (entry.behaviorPattern.variance > 10000) {
      anomalyScore += 20;
    }

    // Check for unusual time of day
    const now = new Date();
    const hour = now.getHours();
    const totalAttempts = entry.behaviorPattern.timeOfDayPattern.reduce((a, b) => a + b, 0);
    const hourPercentage =
      totalAttempts > 0 ? entry.behaviorPattern.timeOfDayPattern[hour] / totalAttempts : 0;

    if (hourPercentage < 0.01 && totalAttempts > 20) {
      // Unusual time if less than 1% of attempts at this hour
      anomalyScore += 15;
    }

    // Check for low trust score
    if (entry.trustScore < 30) {
      anomalyScore += 20;
    }

    // Check context for suspicious patterns
    if (context) {
      if (context.newDevice) anomalyScore += 10;
      if (context.newLocation) anomalyScore += 15;
      if (context.vpnDetected) anomalyScore += 20;
      if (context.torDetected) anomalyScore += 30;
    }

    entry.behaviorPattern.anomalyScore = Math.min(100, anomalyScore);
    return entry.behaviorPattern.anomalyScore;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.entries = new Map(
          parsed.map((item: RateLimitEntry) => [
            item.identifier,
            {
              ...item,
              attempts: item.attempts,
              blockedUntil: item.blockedUntil ? new Date(item.blockedUntil) : null,
            },
          ])
        );
      }
    } catch (error) {
      logger.error('Failed to load rate limit entries from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = Array.from(this.entries.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save rate limit entries to storage:', error);
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopCleanup();
  }
}

// Singleton instance
let rateLimiterInstance: SmartRateLimiter | null = null;

export function getSmartRateLimiter(): SmartRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new SmartRateLimiter();
  }
  return rateLimiterInstance;
}

