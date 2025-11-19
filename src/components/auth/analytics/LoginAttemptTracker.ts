/**
 * Advanced Login Attempt Tracking System
 * Tracks and analyzes login attempts with detailed analytics
 */

import { logger } from '@/lib/logger';

export interface LoginAttempt {
  id: string;
  timestamp: Date;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  failureReason?: string;
  riskScore?: number;
  duration?: number; // Time taken to complete login
  twoFactorUsed?: boolean;
  method?: 'password' | 'biometric' | 'social' | 'passkey';
}

export interface LoginAnalytics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageDuration: number;
  uniqueDevices: number;
  uniqueLocations: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  methodDistribution: {
    password: number;
    biometric: number;
    social: number;
    passkey: number;
  };
  timeDistribution: {
    hour: number[];
    dayOfWeek: number[];
  };
  topFailureReasons: Array<{ reason: string; count: number }>;
}

export class LoginAttemptTracker {
  private attempts: LoginAttempt[] = [];
  private readonly maxStoredAttempts = 1000;
  private readonly storageKey = 'login_attempts_analytics';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Track a new login attempt
   */
  async trackAttempt(attempt: Omit<LoginAttempt, 'id' | 'timestamp'>): Promise<void> {
    const newAttempt: LoginAttempt = {
      ...attempt,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.attempts.push(newAttempt);

    // Keep only the most recent attempts
    if (this.attempts.length > this.maxStoredAttempts) {
      this.attempts = this.attempts.slice(-this.maxStoredAttempts);
    }

    this.saveToStorage();

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.info('Login attempt tracked:', {
        success: newAttempt.success,
        method: newAttempt.method,
        riskScore: newAttempt.riskScore,
      });
    }

    // Send to analytics service (if configured)
    await this.sendToAnalyticsService(newAttempt);
  }

  /**
   * Get analytics for a specific user
   */
  getUserAnalytics(email: string, days: number = 30): LoginAnalytics {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const userAttempts = this.attempts.filter(
      (attempt) =>
        attempt.email.toLowerCase() === email.toLowerCase() &&
        attempt.timestamp >= cutoffDate
    );

    return this.calculateAnalytics(userAttempts);
  }

  /**
   * Get global analytics
   */
  getGlobalAnalytics(days: number = 30): LoginAnalytics {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentAttempts = this.attempts.filter(
      (attempt) => attempt.timestamp >= cutoffDate
    );

    return this.calculateAnalytics(recentAttempts);
  }

  /**
   * Get recent failed attempts for a user
   */
  getRecentFailedAttempts(email: string, hours: number = 24): LoginAttempt[] {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return this.attempts.filter(
      (attempt) =>
        attempt.email.toLowerCase() === email.toLowerCase() &&
        !attempt.success &&
        attempt.timestamp >= cutoffDate
    );
  }

  /**
   * Detect suspicious patterns
   */
  detectSuspiciousActivity(email: string): {
    isSuspicious: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for multiple failed attempts
    const recentFailed = this.getRecentFailedAttempts(email, 1);
    if (recentFailed.length >= 5) {
      reasons.push(`${recentFailed.length} محاولات فاشلة في الساعة الأخيرة`);
      riskLevel = 'high';
    } else if (recentFailed.length >= 3) {
      reasons.push(`${recentFailed.length} محاولات فاشلة في الساعة الأخيرة`);
      riskLevel = 'medium';
    }

    // Check for attempts from multiple locations
    const recentAttempts = this.attempts.filter(
      (attempt) =>
        attempt.email.toLowerCase() === email.toLowerCase() &&
        attempt.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const uniqueLocations = new Set(
      recentAttempts
        .map((a) => a.location?.country)
        .filter((c): c is string => c !== undefined)
    );

    if (uniqueLocations.size >= 3) {
      reasons.push(`محاولات من ${uniqueLocations.size} دول مختلفة`);
      riskLevel = riskLevel === 'high' ? 'critical' : 'high';
    }

    // Check for rapid attempts
    const last10Minutes = recentAttempts.filter(
      (a) => a.timestamp >= new Date(Date.now() - 10 * 60 * 1000)
    );

    if (last10Minutes.length >= 10) {
      reasons.push(`${last10Minutes.length} محاولة في آخر 10 دقائق`);
      riskLevel = 'critical';
    }

    // Check for high risk scores
    const highRiskAttempts = recentAttempts.filter((a) => (a.riskScore || 0) >= 70);
    if (highRiskAttempts.length >= 2) {
      reasons.push('محاولات عالية المخاطر متعددة');
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
      riskLevel,
    };
  }

  /**
   * Clear old attempts
   */
  clearOldAttempts(days: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.attempts = this.attempts.filter((attempt) => attempt.timestamp >= cutoffDate);
    this.saveToStorage();
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.attempts, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'Email',
      'Success',
      'IP Address',
      'Device',
      'Location',
      'Risk Score',
      'Method',
      'Duration',
    ];

    const rows = this.attempts.map((attempt) => [
      attempt.id,
      attempt.timestamp.toISOString(),
      attempt.email,
      attempt.success ? 'Yes' : 'No',
      attempt.ipAddress || 'N/A',
      attempt.deviceFingerprint || 'N/A',
      attempt.location?.country || 'N/A',
      attempt.riskScore?.toString() || 'N/A',
      attempt.method || 'N/A',
      attempt.duration?.toString() || 'N/A',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  // Private methods

  private calculateAnalytics(attempts: LoginAttempt[]): LoginAnalytics {
    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter((a) => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    const durations = attempts
      .map((a) => a.duration)
      .filter((d): d is number => d !== undefined);
    const averageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const uniqueDevices = new Set(
      attempts.map((a) => a.deviceFingerprint).filter((d): d is string => d !== undefined)
    ).size;

    const uniqueLocations = new Set(
      attempts.map((a) => a.location?.country).filter((c): c is string => c !== undefined)
    ).size;

    // Risk distribution
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    attempts.forEach((attempt) => {
      const score = attempt.riskScore || 0;
      if (score < 30) riskDistribution.low++;
      else if (score < 60) riskDistribution.medium++;
      else if (score < 80) riskDistribution.high++;
      else riskDistribution.critical++;
    });

    // Method distribution
    const methodDistribution = {
      password: 0,
      biometric: 0,
      social: 0,
      passkey: 0,
    };

    attempts.forEach((attempt) => {
      const method = attempt.method || 'password';
      methodDistribution[method]++;
    });

    // Time distribution
    const hourDistribution = new Array(24).fill(0);
    const dayOfWeekDistribution = new Array(7).fill(0);

    attempts.forEach((attempt) => {
      const hour = attempt.timestamp.getHours();
      const dayOfWeek = attempt.timestamp.getDay();
      hourDistribution[hour]++;
      dayOfWeekDistribution[dayOfWeek]++;
    });

    // Top failure reasons
    const failureReasons = new Map<string, number>();
    attempts
      .filter((a) => !a.success && a.failureReason)
      .forEach((a) => {
        const reason = a.failureReason!;
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
      });

    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate,
      averageDuration,
      uniqueDevices,
      uniqueLocations,
      riskDistribution,
      methodDistribution,
      timeDistribution: {
        hour: hourDistribution,
        dayOfWeek: dayOfWeekDistribution,
      },
      topFailureReasons,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.attempts = parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    } catch (error) {
      logger.error('Failed to load login attempts from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.attempts));
    } catch (error) {
      logger.error('Failed to save login attempts to storage:', error);
    }
  }

  private async sendToAnalyticsService(attempt: LoginAttempt): Promise<void> {
    // Skip in development
    if (process.env.NODE_ENV === 'development') return;

    try {
      // Send to your analytics service
      await fetch('/api/analytics/login-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });
    } catch (error) {
      // Silently fail - analytics should not break the login flow
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Failed to send login attempt to analytics:', error);
      }
    }
  }
}

// Singleton instance
let trackerInstance: LoginAttemptTracker | null = null;

export function getLoginAttemptTracker(): LoginAttemptTracker {
  if (!trackerInstance) {
    trackerInstance = new LoginAttemptTracker();
  }
  return trackerInstance;
}

