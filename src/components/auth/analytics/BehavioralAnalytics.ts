/**
 * Behavioral Analytics System
 * Advanced user behavior analysis and anomaly detection
 */

import { logger } from '@/lib/logger';

export interface UserBehavior {
  userId: string;
  typingPattern: TypingPattern;
  mousePattern: MousePattern;
  navigationPattern: NavigationPattern;
  timePattern: TimePattern;
  devicePattern: DevicePattern;
  anomalyScore: number;
  lastUpdated: Date;
}

export interface TypingPattern {
  averageSpeed: number; // Characters per minute
  keyPressIntervals: number[]; // Time between key presses
  backspaceFrequency: number; // Percentage of backspaces
  pausePattern: number[]; // Pause durations
  commonMistakes: Map<string, number>;
}

export interface MousePattern {
  averageSpeed: number; // Pixels per second
  clickFrequency: number; // Clicks per minute
  scrollSpeed: number; // Pixels per second
  movementPattern: Array<{ x: number; y: number; timestamp: number }>;
  hoverDuration: number; // Average hover time in ms
}

export interface NavigationPattern {
  commonPages: Map<string, number>;
  sessionDuration: number[]; // Duration in minutes
  pagesPerSession: number[];
  backButtonUsage: number;
  searchUsage: number;
  directNavigation: number; // Percentage of direct URL access
}

export interface TimePattern {
  activeHours: number[]; // Activity by hour (0-23)
  activeDays: number[]; // Activity by day (0-6)
  sessionTimes: Date[]; // Login times
  averageSessionLength: number; // In minutes
  timezone: string;
}

export interface DevicePattern {
  devices: Map<string, number>; // Device fingerprint -> count
  browsers: Map<string, number>;
  operatingSystems: Map<string, number>;
  screenResolutions: Map<string, number>;
  languages: string[];
}

export interface AnomalyDetection {
  isAnomalous: boolean;
  score: number; // 0-100
  factors: Array<{
    factor: string;
    contribution: number;
    description: string;
  }>;
  recommendation: string;
}

export class BehavioralAnalytics {
  private behaviors: Map<string, UserBehavior> = new Map();
  private readonly storageKey = 'user_behaviors';
  private currentUserId: string | null = null;
  private keyPressTimestamps: number[] = [];
  private mouseMovements: Array<{ x: number; y: number; timestamp: number }> = [];

  constructor() {
    this.loadFromStorage();
    this.initializeEventListeners();
  }

  /**
   * Initialize behavior tracking for a user
   */
  initializeTracking(userId: string): void {
    this.currentUserId = userId;
    
    if (!this.behaviors.has(userId)) {
      this.behaviors.set(userId, this.createDefaultBehavior(userId));
    }
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.currentUserId = null;
    this.keyPressTimestamps = [];
    this.mouseMovements = [];
  }

  /**
   * Get behavior profile for a user
   */
  getBehaviorProfile(userId: string): UserBehavior | null {
    return this.behaviors.get(userId) || null;
  }

  /**
   * Detect anomalies in user behavior
   */
  detectAnomalies(userId: string, currentContext?: any): AnomalyDetection {
    const behavior = this.behaviors.get(userId);
    
    if (!behavior) {
      return {
        isAnomalous: true,
        score: 100,
        factors: [
          {
            factor: 'no_baseline',
            contribution: 100,
            description: 'لا يوجد سلوك مرجعي للمستخدم',
          },
        ],
        recommendation: 'يرجى إنشاء ملف سلوكي للمستخدم أولاً',
      };
    }

    const factors: Array<{ factor: string; contribution: number; description: string }> = [];
    let totalScore = 0;

    // Check typing pattern anomalies
    if (currentContext?.typingSpeed) {
      const typingDeviation = Math.abs(
        currentContext.typingSpeed - behavior.typingPattern.averageSpeed
      );
      const typingAnomalyScore = Math.min(
        100,
        (typingDeviation / behavior.typingPattern.averageSpeed) * 100
      );
      
      if (typingAnomalyScore > 50) {
        factors.push({
          factor: 'typing_speed',
          contribution: typingAnomalyScore,
          description: `سرعة الكتابة غير معتادة (${currentContext.typingSpeed} مقابل ${behavior.typingPattern.averageSpeed} المعتاد)`,
        });
        totalScore += typingAnomalyScore * 0.2;
      }
    }

    // Check time pattern anomalies
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    const hourActivity = behavior.timePattern.activeHours[currentHour];
    const totalHourActivity = behavior.timePattern.activeHours.reduce((a, b) => a + b, 0);
    const hourPercentage = totalHourActivity > 0 ? hourActivity / totalHourActivity : 0;
    
    if (hourPercentage < 0.05 && totalHourActivity > 50) {
      const timeAnomalyScore = 40;
      factors.push({
        factor: 'unusual_time',
        contribution: timeAnomalyScore,
        description: `وقت غير معتاد للنشاط (الساعة ${currentHour})`,
      });
      totalScore += timeAnomalyScore * 0.15;
    }

    // Check device pattern anomalies
    if (currentContext?.deviceFingerprint) {
      const deviceKnown = behavior.devicePattern.devices.has(
        currentContext.deviceFingerprint
      );
      
      if (!deviceKnown) {
        const deviceAnomalyScore = 60;
        factors.push({
          factor: 'new_device',
          contribution: deviceAnomalyScore,
          description: 'جهاز جديد غير معروف',
        });
        totalScore += deviceAnomalyScore * 0.25;
      }
    }

    // Check location anomalies
    if (currentContext?.location && behavior.devicePattern) {
      const locationAnomalyScore = 30;
      factors.push({
        factor: 'new_location',
        contribution: locationAnomalyScore,
        description: 'موقع جديد',
      });
      totalScore += locationAnomalyScore * 0.2;
    }

    // Check navigation pattern anomalies
    if (currentContext?.navigationSpeed) {
      const navSpeed = currentContext.navigationSpeed;
      const avgNavSpeed = behavior.navigationPattern.pagesPerSession.reduce((a, b) => a + b, 0) /
        behavior.navigationPattern.pagesPerSession.length;
      
      if (navSpeed > avgNavSpeed * 3) {
        const navAnomalyScore = 35;
        factors.push({
          factor: 'rapid_navigation',
          contribution: navAnomalyScore,
          description: 'تنقل سريع جداً بين الصفحات',
        });
        totalScore += navAnomalyScore * 0.2;
      }
    }

    const isAnomalous = totalScore > 50;
    const recommendation = this.generateRecommendation(totalScore, factors);

    return {
      isAnomalous,
      score: Math.min(100, Math.round(totalScore)),
      factors: factors.sort((a, b) => b.contribution - a.contribution),
      recommendation,
    };
  }

  /**
   * Update typing pattern
   */
  updateTypingPattern(userId: string, event: KeyboardEvent): void {
    if (userId !== this.currentUserId) return;

    const behavior = this.behaviors.get(userId);
    if (!behavior) return;

    const now = Date.now();
    this.keyPressTimestamps.push(now);

    // Keep only last 100 key presses
    if (this.keyPressTimestamps.length > 100) {
      this.keyPressTimestamps.shift();
    }

    // Calculate intervals
    if (this.keyPressTimestamps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.keyPressTimestamps.length; i++) {
        intervals.push(this.keyPressTimestamps[i] - this.keyPressTimestamps[i - 1]);
      }
      behavior.typingPattern.keyPressIntervals = intervals;

      // Calculate average speed (characters per minute)
      const totalTime = (now - this.keyPressTimestamps[0]) / 1000 / 60; // minutes
      behavior.typingPattern.averageSpeed = this.keyPressTimestamps.length / totalTime;
    }

    // Track backspace usage
    if (event.key === 'Backspace') {
      behavior.typingPattern.backspaceFrequency++;
    }

    behavior.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Update mouse pattern
   */
  updateMousePattern(userId: string, event: MouseEvent): void {
    if (userId !== this.currentUserId) return;

    const behavior = this.behaviors.get(userId);
    if (!behavior) return;

    const now = Date.now();
    this.mouseMovements.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
    });

    // Keep only last 100 movements
    if (this.mouseMovements.length > 100) {
      this.mouseMovements.shift();
    }

    // Calculate average speed
    if (this.mouseMovements.length >= 2) {
      let totalDistance = 0;
      let totalTime = 0;

      for (let i = 1; i < this.mouseMovements.length; i++) {
        const prev = this.mouseMovements[i - 1];
        const curr = this.mouseMovements[i];
        
        const distance = Math.sqrt(
          Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
        );
        const time = (curr.timestamp - prev.timestamp) / 1000; // seconds
        
        totalDistance += distance;
        totalTime += time;
      }

      behavior.mousePattern.averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
    }

    behavior.mousePattern.movementPattern = this.mouseMovements.slice(-50);
    behavior.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Update navigation pattern
   */
  updateNavigationPattern(userId: string, page: string): void {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return;

    const count = behavior.navigationPattern.commonPages.get(page) || 0;
    behavior.navigationPattern.commonPages.set(page, count + 1);

    behavior.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Update time pattern
   */
  updateTimePattern(userId: string): void {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return;

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    behavior.timePattern.activeHours[hour]++;
    behavior.timePattern.activeDays[day]++;
    behavior.timePattern.sessionTimes.push(now);

    // Keep only last 100 session times
    if (behavior.timePattern.sessionTimes.length > 100) {
      behavior.timePattern.sessionTimes.shift();
    }

    behavior.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Update device pattern
   */
  updateDevicePattern(userId: string, deviceInfo: any): void {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return;

    if (deviceInfo.fingerprint) {
      const count = behavior.devicePattern.devices.get(deviceInfo.fingerprint) || 0;
      behavior.devicePattern.devices.set(deviceInfo.fingerprint, count + 1);
    }

    if (deviceInfo.browser) {
      const count = behavior.devicePattern.browsers.get(deviceInfo.browser) || 0;
      behavior.devicePattern.browsers.set(deviceInfo.browser, count + 1);
    }

    if (deviceInfo.os) {
      const count = behavior.devicePattern.operatingSystems.get(deviceInfo.os) || 0;
      behavior.devicePattern.operatingSystems.set(deviceInfo.os, count + 1);
    }

    behavior.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Export behavior profile
   */
  exportProfile(userId: string): string {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return '';

    return JSON.stringify(behavior, null, 2);
  }

  // Private methods

  private createDefaultBehavior(userId: string): UserBehavior {
    return {
      userId,
      typingPattern: {
        averageSpeed: 0,
        keyPressIntervals: [],
        backspaceFrequency: 0,
        pausePattern: [],
        commonMistakes: new Map(),
      },
      mousePattern: {
        averageSpeed: 0,
        clickFrequency: 0,
        scrollSpeed: 0,
        movementPattern: [],
        hoverDuration: 0,
      },
      navigationPattern: {
        commonPages: new Map(),
        sessionDuration: [],
        pagesPerSession: [],
        backButtonUsage: 0,
        searchUsage: 0,
        directNavigation: 0,
      },
      timePattern: {
        activeHours: new Array(24).fill(0),
        activeDays: new Array(7).fill(0),
        sessionTimes: [],
        averageSessionLength: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      devicePattern: {
        devices: new Map(),
        browsers: new Map(),
        operatingSystems: new Map(),
        screenResolutions: new Map(),
        languages: [],
      },
      anomalyScore: 0,
      lastUpdated: new Date(),
    };
  }

  private generateRecommendation(score: number, factors: any[]): string {
    if (score < 30) {
      return 'السلوك طبيعي. لا توجد إجراءات مطلوبة.';
    } else if (score < 50) {
      return 'سلوك غير معتاد قليلاً. يُنصح بمراقبة النشاط.';
    } else if (score < 70) {
      return 'سلوك مشبوه. يُنصح بتفعيل المصادقة الثنائية إذا لم تكن مفعلة.';
    } else {
      return 'سلوك مشبوه جداً. يُنصح بتغيير كلمة المرور فوراً والتحقق من الأجهزة المتصلة.';
    }
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;

    // These would be initialized when tracking starts
    // For now, we'll just set up the structure
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.behaviors = new Map(
          parsed.map((item: any) => [
            item.userId,
            {
              ...item,
              lastUpdated: new Date(item.lastUpdated),
              typingPattern: {
                ...item.typingPattern,
                commonMistakes: new Map(item.typingPattern.commonMistakes),
              },
              navigationPattern: {
                ...item.navigationPattern,
                commonPages: new Map(item.navigationPattern.commonPages),
                sessionTimes: item.navigationPattern.sessionTimes.map((t: string) => new Date(t)),
              },
              timePattern: {
                ...item.timePattern,
                sessionTimes: item.timePattern.sessionTimes.map((t: string) => new Date(t)),
              },
              devicePattern: {
                ...item.devicePattern,
                devices: new Map(item.devicePattern.devices),
                browsers: new Map(item.devicePattern.browsers),
                operatingSystems: new Map(item.devicePattern.operatingSystems),
                screenResolutions: new Map(item.devicePattern.screenResolutions),
              },
            },
          ])
        );
      }
    } catch (error) {
      logger.error('Failed to load behaviors from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = Array.from(this.behaviors.values()).map((behavior) => ({
        ...behavior,
        typingPattern: {
          ...behavior.typingPattern,
          commonMistakes: Array.from(behavior.typingPattern.commonMistakes.entries()),
        },
        navigationPattern: {
          ...behavior.navigationPattern,
          commonPages: Array.from(behavior.navigationPattern.commonPages.entries()),
        },
        devicePattern: {
          ...behavior.devicePattern,
          devices: Array.from(behavior.devicePattern.devices.entries()),
          browsers: Array.from(behavior.devicePattern.browsers.entries()),
          operatingSystems: Array.from(behavior.devicePattern.operatingSystems.entries()),
          screenResolutions: Array.from(behavior.devicePattern.screenResolutions.entries()),
        },
      }));

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save behaviors to storage:', error);
    }
  }
}

// Singleton instance
let behavioralAnalyticsInstance: BehavioralAnalytics | null = null;

export function getBehavioralAnalytics(): BehavioralAnalytics {
  if (!behavioralAnalyticsInstance) {
    behavioralAnalyticsInstance = new BehavioralAnalytics();
  }
  return behavioralAnalyticsInstance;
}

