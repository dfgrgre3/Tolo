/**
 * Advanced Session Management System
 * Multi-device session tracking and management
 */

import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
  isTrusted: boolean;
  metadata?: Record<string, any>;
}

export interface SessionActivity {
  sessionId: string;
  timestamp: Date;
  action: string;
  details?: Record<string, any>;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  trustedSessions: number;
  deviceDistribution: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  locationDistribution: Map<string, number>;
  recentActivity: SessionActivity[];
}

export class AdvancedSessionManager {
  private sessions: SessionInfo[] = [];
  private activities: SessionActivity[] = [];
  private readonly storageKey = 'session_info';
  private readonly activitiesKey = 'session_activities';
  private currentSessionId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initialize current session
   */
  async initializeSession(userId: string, sessionId: string): Promise<SessionInfo> {
    this.currentSessionId = sessionId;

    // Get device information
    const deviceInfo = this.getDeviceInfo();

    // Get IP and location (from server)
    let ipAddress = 'Unknown';
    let location = undefined;

    try {
      const response = await fetch('/api/session/info');
      if (response.ok) {
        const data = await response.json();
        ipAddress = data.ipAddress || 'Unknown';
        location = data.location;
      }
    } catch (error) {
      logger.error('Failed to get session info:', error);
    }

    const session: SessionInfo = {
      id: sessionId,
      userId,
      deviceId: this.getDeviceId(),
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress,
      location,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isCurrent: true,
      isTrusted: false,
    };

    // Add to sessions
    this.sessions = this.sessions.map((s) => ({ ...s, isCurrent: false }));
    this.sessions.push(session);
    this.saveToStorage();

    // Track activity
    this.trackActivity(sessionId, 'session_created');

    return session;
  }

  /**
   * Get all sessions for current user
   */
  async getAllSessions(): Promise<SessionInfo[]> {
    try {
      const response = await fetch('/api/session/list');
      if (response.ok) {
        const data = await response.json();
        this.sessions = data.sessions.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          lastActivityAt: new Date(s.lastActivityAt),
          expiresAt: new Date(s.expiresAt),
        }));
        this.saveToStorage();
        return this.sessions;
      }
    } catch (error) {
      logger.error('Failed to get sessions:', error);
    }

    return this.sessions;
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionInfo | null {
    return this.sessions.find((s) => s.isCurrent) || null;
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId?: string): Promise<void> {
    const sid = sessionId || this.currentSessionId;
    if (!sid) return;

    const session = this.sessions.find((s) => s.id === sid);
    if (session) {
      session.lastActivityAt = new Date();
      this.saveToStorage();
    }

    // Update on server
    try {
      await fetch('/api/session/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch('/api/session/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }

      // Remove from local storage
      this.sessions = this.sessions.filter((s) => s.id !== sessionId);
      this.saveToStorage();

      // Track activity
      this.trackActivity(sessionId, 'session_terminated');

      toast.success('تم إنهاء الجلسة بنجاح');
    } catch (error: any) {
      logger.error('Failed to terminate session:', error);
      throw error;
    }
  }

  /**
   * Terminate all other sessions
   */
  async terminateAllOtherSessions(): Promise<void> {
    try {
      const response = await fetch('/api/session/terminate-others', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to terminate other sessions');
      }

      // Keep only current session
      this.sessions = this.sessions.filter((s) => s.isCurrent);
      this.saveToStorage();

      toast.success('تم إنهاء جميع الجلسات الأخرى');
    } catch (error: any) {
      logger.error('Failed to terminate other sessions:', error);
      throw error;
    }
  }

  /**
   * Trust a session
   */
  async trustSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch('/api/session/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to trust session');
      }

      // Update locally
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.isTrusted = true;
        this.saveToStorage();
      }

      toast.success('تم وضع علامة ثقة على الجلسة');
    } catch (error: any) {
      logger.error('Failed to trust session:', error);
      throw error;
    }
  }

  /**
   * Untrust a session
   */
  async untrustSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch('/api/session/untrust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to untrust session');
      }

      // Update locally
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.isTrusted = false;
        this.saveToStorage();
      }

      toast.success('تم إزالة علامة الثقة من الجلسة');
    } catch (error: any) {
      logger.error('Failed to untrust session:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getStatistics(): SessionStatistics {
    const now = new Date();
    const activeSessions = this.sessions.filter((s) => s.expiresAt > now);
    const trustedSessions = this.sessions.filter((s) => s.isTrusted);

    const deviceDistribution = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };

    this.sessions.forEach((s) => {
      deviceDistribution[s.deviceType]++;
    });

    const locationDistribution = new Map<string, number>();
    this.sessions.forEach((s) => {
      if (s.location?.country) {
        const count = locationDistribution.get(s.location.country) || 0;
        locationDistribution.set(s.location.country, count + 1);
      }
    });

    return {
      totalSessions: this.sessions.length,
      activeSessions: activeSessions.length,
      trustedSessions: trustedSessions.length,
      deviceDistribution,
      locationDistribution,
      recentActivity: this.activities.slice(0, 20),
    };
  }

  /**
   * Track session activity
   */
  trackActivity(sessionId: string, action: string, details?: Record<string, any>): void {
    const activity: SessionActivity = {
      sessionId,
      timestamp: new Date(),
      action,
      details,
    };

    this.activities.unshift(activity);

    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }

    this.saveActivities();
  }

  /**
   * Get activities for a session
   */
  getSessionActivities(sessionId: string, limit: number = 20): SessionActivity[] {
    return this.activities.filter((a) => a.sessionId === sessionId).slice(0, limit);
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(sessionId: string): boolean {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return true;

    return session.expiresAt < new Date();
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, days: number = 30): Promise<void> {
    try {
      const response = await fetch('/api/session/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, days }),
      });

      if (!response.ok) {
        throw new Error('Failed to extend session');
      }

      // Update locally
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        this.saveToStorage();
      }

      toast.success('تم تمديد الجلسة بنجاح');
    } catch (error: any) {
      logger.error('Failed to extend session:', error);
      throw error;
    }
  }

  // Private methods

  private getDeviceInfo(): {
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    os: string;
  } {
    if (typeof window === 'undefined') {
      return {
        deviceName: 'Unknown',
        deviceType: 'unknown',
        browser: 'Unknown',
        os: 'Unknown',
      };
    }

    const ua = navigator.userAgent;

    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    if (/Mobile|Android|iPhone/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/iPad|Tablet/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/Windows|Mac|Linux/i.test(ua)) {
      deviceType = 'desktop';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
    }

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Mac')) {
      os = 'macOS';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
    }

    // Device name
    let deviceName = `${os} - ${browser}`;
    if (deviceType === 'mobile') {
      if (ua.includes('iPhone')) deviceName = 'iPhone';
      else if (ua.includes('Android')) deviceName = 'Android Phone';
      else deviceName = 'Mobile Device';
    } else if (deviceType === 'tablet') {
      if (ua.includes('iPad')) deviceName = 'iPad';
      else deviceName = 'Tablet';
    }

    return { deviceName, deviceType, browser, os };
  }

  private getDeviceId(): string {
    if (typeof window === 'undefined') return 'unknown';

    // Try to get from storage
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      // Generate new device ID
      deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }

    return deviceId;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sessions = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          lastActivityAt: new Date(s.lastActivityAt),
          expiresAt: new Date(s.expiresAt),
        }));
      }

      const storedActivities = localStorage.getItem(this.activitiesKey);
      if (storedActivities) {
        const parsed = JSON.parse(storedActivities);
        this.activities = parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    } catch (error) {
      logger.error('Failed to load sessions from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (error) {
      logger.error('Failed to save sessions to storage:', error);
    }
  }

  private saveActivities(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.activitiesKey, JSON.stringify(this.activities));
    } catch (error) {
      logger.error('Failed to save activities to storage:', error);
    }
  }
}

// Singleton instance
let sessionManagerInstance: AdvancedSessionManager | null = null;

export function getAdvancedSessionManager(): AdvancedSessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new AdvancedSessionManager();
  }
  return sessionManagerInstance;
}

