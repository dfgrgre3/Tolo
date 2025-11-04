/**
 * Advanced Risk Assessment Service
 * يقيّم مستوى المخاطر لعمليات تسجيل الدخول
 */

import { DeviceFingerprint } from './device-fingerprint';

export interface RiskFactors {
  // Location-based
  newLocation: boolean;
  unusualLocation: boolean;
  vpnDetected: boolean;
  
  // Device-based
  newDevice: boolean;
  untrustedDevice: boolean;
  deviceMismatch: boolean;
  
  // Behavioral
  unusualTime: boolean;
  rapidRetries: boolean;
  suspiciousPattern: boolean;
  
  // Network-based
  suspiciousIP: boolean;
  multipleFailed: boolean;
  
  // Account-based
  recentPasswordChange: boolean;
  sensitiveDataAccess: boolean;
}

export interface RiskAssessment {
  score: number; // 0-100, higher is riskier
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactors;
  recommendations: string[];
  requireAdditionalAuth: boolean;
  blockAccess: boolean;
}

export interface LoginAttempt {
  userId?: string;
  email: string;
  ip: string;
  deviceFingerprint?: DeviceFingerprint;
  timestamp: Date;
  success: boolean;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
}

export class RiskAssessmentService {
  private static instance: RiskAssessmentService;

  private constructor() {}

  public static getInstance(): RiskAssessmentService {
    if (!RiskAssessmentService.instance) {
      RiskAssessmentService.instance = new RiskAssessmentService();
    }
    return RiskAssessmentService.instance;
  }

  /**
   * Assess risk for a login attempt
   */
  async assessLoginRisk(
    attempt: LoginAttempt,
    history?: LoginAttempt[]
  ): Promise<RiskAssessment> {
    const factors: RiskFactors = {
      newLocation: false,
      unusualLocation: false,
      vpnDetected: false,
      newDevice: false,
      untrustedDevice: false,
      deviceMismatch: false,
      unusualTime: false,
      rapidRetries: false,
      suspiciousPattern: false,
      suspiciousIP: false,
      multipleFailed: false,
      recentPasswordChange: false,
      sensitiveDataAccess: false,
    };

    let score = 0;
    const recommendations: string[] = [];

    // Analyze location
    if (history && history.length > 0) {
      const locationRisk = this.assessLocationRisk(attempt, history);
      factors.newLocation = locationRisk.isNew;
      factors.unusualLocation = locationRisk.isUnusual;
      
      if (locationRisk.isNew) {
        score += 15;
        recommendations.push('تسجيل دخول من موقع جديد');
      }
      
      if (locationRisk.isUnusual) {
        score += 25;
        recommendations.push('موقع غير معتاد للحساب');
      }
    }

    // Analyze device
    if (attempt.deviceFingerprint && history) {
      const deviceRisk = this.assessDeviceRisk(attempt.deviceFingerprint, history);
      factors.newDevice = deviceRisk.isNew;
      factors.deviceMismatch = deviceRisk.mismatch;
      
      if (deviceRisk.isNew) {
        score += 20;
        recommendations.push('تسجيل دخول من جهاز جديد');
      }
      
      if (deviceRisk.mismatch) {
        score += 15;
        recommendations.push('اختلاف في معلومات الجهاز');
      }
    }

    // Analyze timing
    const timeRisk = this.assessTimeRisk(attempt, history);
    factors.unusualTime = timeRisk.isUnusual;
    factors.rapidRetries = timeRisk.isRapid;
    
    if (timeRisk.isUnusual) {
      score += 10;
      recommendations.push('تسجيل دخول في وقت غير معتاد');
    }
    
    if (timeRisk.isRapid) {
      score += 30;
      recommendations.push('محاولات متكررة بسرعة');
    }

    // Analyze IP
    const ipRisk = this.assessIPRisk(attempt.ip, history);
    factors.suspiciousIP = ipRisk.isSuspicious;
    factors.multipleFailed = ipRisk.hasFailures;
    
    if (ipRisk.isSuspicious) {
      score += 35;
      recommendations.push('IP مشبوه أو معروف بالنشاط الضار');
    }
    
    if (ipRisk.hasFailures) {
      score += 20;
      recommendations.push('محاولات فاشلة سابقة من هذا IP');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 75) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';
    else level = 'low';

    // Determine actions
    const requireAdditionalAuth = score >= 25;
    const blockAccess = score >= 75;

    if (requireAdditionalAuth) {
      recommendations.push('يُنصح بمصادقة إضافية (2FA)');
    }

    if (blockAccess) {
      recommendations.push('يُنصح بحظر الوصول وطلب تحقق إضافي');
    }

    return {
      score,
      level,
      factors,
      recommendations,
      requireAdditionalAuth,
      blockAccess,
    };
  }

  /**
   * Assess location-based risk
   */
  private assessLocationRisk(
    attempt: LoginAttempt,
    history: LoginAttempt[]
  ): {
    isNew: boolean;
    isUnusual: boolean;
  } {
    if (!attempt.location || history.length === 0) {
      return { isNew: false, isUnusual: false };
    }

    const successfulAttempts = history.filter((h) => h.success);
    
    // Check if location is new
    const knownCountries = new Set(
      successfulAttempts
        .filter((h) => h.location?.country)
        .map((h) => h.location!.country)
    );
    
    const isNew = attempt.location.country
      ? !knownCountries.has(attempt.location.country)
      : false;

    // Check if location is unusual (less than 5% of logins)
    const countryCount = successfulAttempts.filter(
      (h) => h.location?.country === attempt.location?.country
    ).length;
    
    const isUnusual = countryCount < successfulAttempts.length * 0.05;

    return { isNew, isUnusual };
  }

  /**
   * Assess device-based risk
   */
  private assessDeviceRisk(
    fingerprint: DeviceFingerprint,
    history: LoginAttempt[]
  ): {
    isNew: boolean;
    mismatch: boolean;
  } {
    const successfulAttempts = history.filter(
      (h) => h.success && h.deviceFingerprint
    );

    // Check if device is completely new
    const knownFingerprints = successfulAttempts.map(
      (h) => h.deviceFingerprint!.fingerprint
    );
    
    const isNew = !knownFingerprints.includes(fingerprint.fingerprint);

    // Check for suspicious device changes
    const recentAttempts = successfulAttempts.slice(-5);
    const mismatch = recentAttempts.some((h) => {
      const fp = h.deviceFingerprint!;
      return (
        fp.os !== fingerprint.os ||
        fp.browser !== fingerprint.browser
      );
    });

    return { isNew, mismatch };
  }

  /**
   * Assess timing-based risk
   */
  private assessTimeRisk(
    attempt: LoginAttempt,
    history?: LoginAttempt[]
  ): {
    isUnusual: boolean;
    isRapid: boolean;
  } {
    if (!history || history.length === 0) {
      return { isUnusual: false, isRapid: false };
    }

    // Check for unusual time (based on user's typical login times)
    const hour = attempt.timestamp.getHours();
    const successfulHours = history
      .filter((h) => h.success)
      .map((h) => h.timestamp.getHours());
    
    const hourCounts = new Map<number, number>();
    successfulHours.forEach((h) => {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    });
    
    const totalLogins = successfulHours.length;
    const currentHourCount = hourCounts.get(hour) || 0;
    const isUnusual = currentHourCount < totalLogins * 0.1;

    // Check for rapid retries (more than 3 attempts in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAttempts = history.filter(
      (h) => h.timestamp > fiveMinutesAgo && h.email === attempt.email
    );
    
    const isRapid = recentAttempts.length > 3;

    return { isUnusual, isRapid };
  }

  /**
   * Assess IP-based risk
   */
  private assessIPRisk(
    ip: string,
    history?: LoginAttempt[]
  ): {
    isSuspicious: boolean;
    hasFailures: boolean;
  } {
    // Check against known suspicious IPs (this would integrate with a real service)
    const suspiciousIPs = new Set([
      // This would be populated from a threat intelligence feed
    ]);
    
    const isSuspicious = suspiciousIPs.has(ip);

    // Check for multiple failed attempts from this IP
    const ipAttempts = history?.filter((h) => h.ip === ip) || [];
    const failedAttempts = ipAttempts.filter((h) => !h.success);
    const hasFailures = failedAttempts.length >= 3;

    return { isSuspicious, hasFailures };
  }

  /**
   * Calculate anomaly score based on behavioral patterns
   */
  async calculateAnomalyScore(
    userId: string,
    currentBehavior: {
      loginTime: Date;
      deviceFingerprint: DeviceFingerprint;
      location?: { lat: number; lng: number };
    }
  ): Promise<number> {
    // This would analyze patterns like:
    // - Typical login times
    // - Usual locations
    // - Common devices
    // - Session durations
    // - Navigation patterns
    
    // For now, return a simple score
    return 0;
  }
}

export const riskAssessmentService = RiskAssessmentService.getInstance();

