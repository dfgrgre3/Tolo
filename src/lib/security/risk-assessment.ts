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
   * Assess risk for a login attempt with validation and timeout protection
   */
  async assessLoginRisk(
    attempt: LoginAttempt,
    history?: LoginAttempt[]
  ): Promise<RiskAssessment> {
    // Validate input
    if (!attempt || typeof attempt !== 'object') {
      throw new Error('Invalid login attempt data');
    }

    if (!attempt.email || typeof attempt.email !== 'string' || attempt.email.trim().length === 0) {
      throw new Error('Email is required for risk assessment');
    }

    if (!attempt.ip || typeof attempt.ip !== 'string' || attempt.ip.trim().length === 0) {
      throw new Error('IP address is required for risk assessment');
    }

    if (!attempt.userAgent || typeof attempt.userAgent !== 'string' || attempt.userAgent.trim().length === 0) {
      throw new Error('User agent is required for risk assessment');
    }

    // Validate history if provided
    if (history && (!Array.isArray(history) || history.length > 1000)) {
      // Limit history to prevent performance issues
      history = history.slice(0, 1000);
    }

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

    // Wrap assessment in timeout protection
    try {
      const assessmentPromise = this.performAssessment(attempt, history, factors, score, recommendations);
      const timeoutPromise = new Promise<RiskAssessment>((resolve) => {
        setTimeout(() => {
          // Return default low-risk assessment on timeout
          resolve({
            score: 0,
            level: 'low',
            factors,
            recommendations: [],
            requireAdditionalAuth: false,
            blockAccess: false,
          });
        }, 5000); // 5 second timeout
      });

      return await Promise.race([assessmentPromise, timeoutPromise]);
    } catch (error) {
      // Return default low-risk assessment on error
      return {
        score: 0,
        level: 'low',
        factors,
        recommendations: [],
        requireAdditionalAuth: false,
        blockAccess: false,
      };
    }
  }

  /**
   * Perform the actual risk assessment (internal method)
   */
  private async performAssessment(
    attempt: LoginAttempt,
    history: LoginAttempt[] | undefined,
    factors: RiskFactors,
    score: number,
    recommendations: string[]
  ): Promise<RiskAssessment> {

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
   * Assess location-based risk with validation
   */
  private assessLocationRisk(
    attempt: LoginAttempt,
    history: LoginAttempt[]
  ): {
    isNew: boolean;
    isUnusual: boolean;
  } {
    // Validate inputs
    if (!attempt || !history || !Array.isArray(history)) {
      return { isNew: false, isUnusual: false };
    }

    if (!attempt.location || history.length === 0) {
      return { isNew: false, isUnusual: false };
    }

    // Limit history size for performance
    const limitedHistory = history.slice(0, 1000);

    const successfulAttempts = limitedHistory.filter((h) => h && h.success);
    
    if (successfulAttempts.length === 0) {
      return { isNew: true, isUnusual: false };
    }
    
    // Check if location is new
    const knownCountries = new Set(
      successfulAttempts
        .filter((h) => h.location?.country && typeof h.location.country === 'string')
        .map((h) => h.location!.country!)
    );
    
    const isNew = attempt.location.country && typeof attempt.location.country === 'string'
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
   * Assess device-based risk with validation
   */
  private assessDeviceRisk(
    fingerprint: DeviceFingerprint,
    history: LoginAttempt[]
  ): {
    isNew: boolean;
    mismatch: boolean;
  } {
    // Validate inputs
    if (!fingerprint || typeof fingerprint !== 'object') {
      return { isNew: false, mismatch: false };
    }

    if (!fingerprint.fingerprint || typeof fingerprint.fingerprint !== 'string') {
      return { isNew: false, mismatch: false };
    }

    if (!history || !Array.isArray(history)) {
      return { isNew: true, mismatch: false };
    }

    // Limit history size for performance
    const limitedHistory = history.slice(0, 1000);

    const successfulAttempts = limitedHistory.filter(
      (h) => h && h.success && h.deviceFingerprint && typeof h.deviceFingerprint === 'object'
    );

    if (successfulAttempts.length === 0) {
      return { isNew: true, mismatch: false };
    }

    // Check if device is completely new
    const knownFingerprints = successfulAttempts
      .map((h) => h.deviceFingerprint!.fingerprint)
      .filter((fp): fp is string => typeof fp === 'string');
    
    const isNew = !knownFingerprints.includes(fingerprint.fingerprint);

    // Check for suspicious device changes
    const recentAttempts = successfulAttempts.slice(-5);
    const mismatch = recentAttempts.some((h) => {
      const fp = h.deviceFingerprint!;
      return (
        (fp.os && fingerprint.os && fp.os !== fingerprint.os) ||
        (fp.browser && fingerprint.browser && fp.browser !== fingerprint.browser)
      );
    });

    return { isNew, mismatch };
  }

  /**
   * Assess timing-based risk with validation
   */
  private assessTimeRisk(
    attempt: LoginAttempt,
    history?: LoginAttempt[]
  ): {
    isUnusual: boolean;
    isRapid: boolean;
  } {
    // Validate inputs
    if (!attempt || !attempt.timestamp) {
      return { isUnusual: false, isRapid: false };
    }

    if (!history || !Array.isArray(history) || history.length === 0) {
      return { isUnusual: false, isRapid: false };
    }

    // Limit history size for performance
    const limitedHistory = history.slice(0, 1000);

    // Validate timestamp
    const attemptTimestamp = attempt.timestamp instanceof Date 
      ? attempt.timestamp 
      : new Date(attempt.timestamp);
    
    if (isNaN(attemptTimestamp.getTime())) {
      return { isUnusual: false, isRapid: false };
    }

    // Check for unusual time (based on user's typical login times)
    const hour = attemptTimestamp.getHours();
    const successfulHours = limitedHistory
      .filter((h) => h && h.success && h.timestamp)
      .map((h) => {
        const ts = h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp);
        return isNaN(ts.getTime()) ? null : ts.getHours();
      })
      .filter((h): h is number => h !== null);
    
    if (successfulHours.length === 0) {
      return { isUnusual: false, isRapid: false };
    }

    const hourCounts = new Map<number, number>();
    successfulHours.forEach((h) => {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    });
    
    const totalLogins = successfulHours.length;
    const currentHourCount = hourCounts.get(hour) || 0;
    const isUnusual = currentHourCount < totalLogins * 0.1;

    // Check for rapid retries (more than 3 attempts in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAttempts = limitedHistory.filter((h) => {
      if (!h || !h.timestamp || !h.email) return false;
      const ts = h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp);
      return !isNaN(ts.getTime()) && ts > fiveMinutesAgo && h.email === attempt.email;
    });
    
    const isRapid = recentAttempts.length > 3;

    return { isUnusual, isRapid };
  }

  /**
   * Assess IP-based risk with validation
   */
  private assessIPRisk(
    ip: string,
    history?: LoginAttempt[]
  ): {
    isSuspicious: boolean;
    hasFailures: boolean;
  } {
    // Validate IP
    if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
      return { isSuspicious: false, hasFailures: false };
    }

    const trimmedIP = ip.trim();

    // Basic IP format validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (!ipv4Regex.test(trimmedIP) && !ipv6Regex.test(trimmedIP) && trimmedIP !== 'unknown') {
      // Invalid IP format - treat as suspicious
      return { isSuspicious: true, hasFailures: false };
    }

    // Check against known suspicious IPs (this would integrate with a real service)
    const suspiciousIPs = new Set<string>([
      // This would be populated from a threat intelligence feed
    ]);
    
    const isSuspicious = suspiciousIPs.has(trimmedIP);

    // Check for multiple failed attempts from this IP
    if (!history || !Array.isArray(history)) {
      return { isSuspicious, hasFailures: false };
    }

    // Limit history size for performance
    const limitedHistory = history.slice(0, 1000);

    const ipAttempts = limitedHistory.filter((h) => h && h.ip && h.ip.trim() === trimmedIP);
    const failedAttempts = ipAttempts.filter((h) => !h.success);
    const hasFailures = failedAttempts.length >= 3;

    return { isSuspicious, hasFailures };
  }

  /**
   * Calculate anomaly score based on behavioral patterns with validation
   */
  async calculateAnomalyScore(
    userId: string,
    currentBehavior: {
      loginTime: Date;
      deviceFingerprint: DeviceFingerprint;
      location?: { lat: number; lng: number };
    }
  ): Promise<number> {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!currentBehavior || typeof currentBehavior !== 'object') {
      throw new Error('Current behavior data is required');
    }

    if (!currentBehavior.loginTime) {
      throw new Error('Login time is required');
    }

    if (!currentBehavior.deviceFingerprint || typeof currentBehavior.deviceFingerprint !== 'object') {
      throw new Error('Device fingerprint is required');
    }

    // Validate login time
    const loginTime = currentBehavior.loginTime instanceof Date 
      ? currentBehavior.loginTime 
      : new Date(currentBehavior.loginTime);
    
    if (isNaN(loginTime.getTime())) {
      throw new Error('Invalid login time');
    }

    // Validate location if provided
    if (currentBehavior.location) {
      const { lat, lng } = currentBehavior.location;
      if (typeof lat !== 'number' || typeof lng !== 'number' ||
          isNaN(lat) || isNaN(lng) ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid location coordinates');
      }
    }

    // Wrap in timeout protection
    try {
      const scorePromise = this.performAnomalyCalculation(userId, currentBehavior, loginTime);
      const timeoutPromise = new Promise<number>((resolve) => {
        setTimeout(() => resolve(0), 5000); // 5 second timeout, return 0 (no anomaly)
      });

      return await Promise.race([scorePromise, timeoutPromise]);
    } catch (error) {
      // Return 0 (no anomaly) on error
      return 0;
    }
  }

  /**
   * Perform the actual anomaly calculation (internal method)
   */
  private async performAnomalyCalculation(
    userId: string,
    currentBehavior: {
      loginTime: Date;
      deviceFingerprint: DeviceFingerprint;
      location?: { lat: number; lng: number };
    },
    loginTime: Date
  ): Promise<number> {
    // This would analyze patterns like:
    // - Typical login times
    // - Usual locations
    // - Common devices
    // - Session durations
    // - Navigation patterns
    
    // For now, return a simple score
    // In a real implementation, this would query user behavior history
    // and compare against current behavior
    
    return 0;
  }
}

export const riskAssessmentService = RiskAssessmentService.getInstance();

