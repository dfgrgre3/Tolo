/**
 * Device Management Service
 * إدارة شاملة للأجهزة المستخدمة في الحساب
 */

import { prisma } from '@/lib/prisma';
import { DeviceFingerprint, DeviceInfo, calculateDeviceTrustLevel } from './device-fingerprint';
import { v4 as uuidv4 } from 'uuid';

export interface TrustedDevice {
  id: string;
  userId: string;
  fingerprint: string;
  name: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  os: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  lastIP: string;
  location?: {
    country?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}

export class DeviceManagerService {
  private static instance: DeviceManagerService;

  private constructor() {}

  public static getInstance(): DeviceManagerService {
    if (!DeviceManagerService.instance) {
      DeviceManagerService.instance = new DeviceManagerService();
    }
    return DeviceManagerService.instance;
  }

  /**
   * Register a new device or update existing one
   */
  async registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint,
    ip: string,
    location?: { country?: string; city?: string }
  ): Promise<TrustedDevice> {
    // Check if device already exists
    const existing = await this.getDeviceByFingerprint(userId, fingerprint.fingerprint);

    if (existing) {
      // Update last seen
      return this.updateDeviceLastSeen(existing.id, ip, location);
    }

    // Create new device
    const deviceName = this.generateDeviceName(fingerprint);
    const deviceType = this.determineDeviceType(fingerprint);

    const device: TrustedDevice = {
      id: uuidv4(),
      userId,
      fingerprint: fingerprint.fingerprint,
      name: deviceName,
      deviceType,
      browser: fingerprint.browser,
      os: fingerprint.os,
      trusted: false, // New devices start as untrusted
      firstSeen: new Date(),
      lastSeen: new Date(),
      lastIP: ip,
      location,
      metadata: {
        screen: fingerprint.screen,
        timezone: fingerprint.timezone,
        language: fingerprint.language,
      },
    };

    // Store in database (we'll need to add this to schema)
    // For now, we'll store in Session or create a new DeviceModel
    
    return device;
  }

  /**
   * Get device by fingerprint
   */
  async getDeviceByFingerprint(
    userId: string,
    fingerprint: string
  ): Promise<TrustedDevice | null> {
    // Query from database
    // This is a placeholder - needs actual DB implementation
    return null;
  }

  /**
   * Update device last seen
   */
  async updateDeviceLastSeen(
    deviceId: string,
    ip: string,
    location?: { country?: string; city?: string }
  ): Promise<TrustedDevice> {
    // Update in database
    // Placeholder implementation
    throw new Error('Not implemented');
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<TrustedDevice[]> {
    // Get from database
    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastAccessed: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      fingerprint: '', // Extract from deviceInfo
      name: this.parseDeviceName(session.deviceInfo),
      deviceType: this.parseDeviceType(session.deviceInfo),
      browser: this.parseBrowser(session.userAgent),
      os: this.parseOS(session.userAgent),
      trusted: true, // Active sessions are considered trusted
      firstSeen: session.createdAt,
      lastSeen: session.lastAccessed,
      lastIP: session.ip,
    }));
  }

  /**
   * Trust a device
   */
  async trustDevice(deviceId: string, userId: string): Promise<void> {
    // Update trust status in database
    await prisma.session.updateMany({
      where: {
        id: deviceId,
        userId,
      },
      data: {
        // Add trusted field when we update schema
      },
    });
  }

  /**
   * Untrust a device
   */
  async untrustDevice(deviceId: string, userId: string): Promise<void> {
    // Update trust status in database
    await prisma.session.updateMany({
      where: {
        id: deviceId,
        userId,
      },
      data: {
        // Add trusted field when we update schema
      },
    });
  }

  /**
   * Remove a device (revoke all sessions)
   */
  async removeDevice(deviceId: string, userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        id: deviceId,
        userId,
      },
    });
  }

  /**
   * Remove all devices except current one
   */
  async removeAllDevicesExcept(
    userId: string,
    currentDeviceId: string
  ): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentDeviceId },
      },
    });

    return result.count;
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(
    userId: string,
    fingerprint: string
  ): Promise<boolean> {
    const device = await this.getDeviceByFingerprint(userId, fingerprint);
    return device?.trusted || false;
  }

  /**
   * Get device trust analysis
   */
  async getDeviceTrustAnalysis(deviceId: string): Promise<{
    level: 'high' | 'medium' | 'low' | 'unknown';
    score: number;
    reasons: string[];
  }> {
    const device = await this.getDeviceById(deviceId);
    
    if (!device) {
      return {
        level: 'unknown',
        score: 0,
        reasons: ['الجهاز غير موجود'],
      };
    }

    return calculateDeviceTrustLevel({
      id: device.id,
      fingerprint: device.fingerprint,
      name: device.name,
      type: device.deviceType,
      browser: device.browser,
      os: device.os,
      trusted: device.trusted,
      firstSeen: device.firstSeen,
      lastSeen: device.lastSeen,
      location: device.location,
    });
  }

  /**
   * Get device by ID
   */
  private async getDeviceById(deviceId: string): Promise<TrustedDevice | null> {
    const session = await prisma.session.findUnique({
      where: { id: deviceId },
    });

    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      fingerprint: '',
      name: this.parseDeviceName(session.deviceInfo),
      deviceType: this.parseDeviceType(session.deviceInfo),
      browser: this.parseBrowser(session.userAgent),
      os: this.parseOS(session.userAgent),
      trusted: true,
      firstSeen: session.createdAt,
      lastSeen: session.lastAccessed,
      lastIP: session.ip,
    };
  }

  /**
   * Generate friendly device name
   */
  private generateDeviceName(fingerprint: DeviceFingerprint): string {
    const parts: string[] = [];

    if (fingerprint.device && fingerprint.device !== 'unknown') {
      parts.push(fingerprint.device);
    }

    if (fingerprint.os && fingerprint.os !== 'Unknown') {
      parts.push(fingerprint.os);
    }

    if (fingerprint.browser && fingerprint.browser !== 'Unknown') {
      parts.push(fingerprint.browser);
    }

    return parts.length > 0 ? parts.join(' - ') : 'جهاز غير معروف';
  }

  /**
   * Determine device type from fingerprint
   */
  private determineDeviceType(
    fingerprint: DeviceFingerprint
  ): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    const device = fingerprint.device.toLowerCase();
    
    if (device.includes('mobile')) return 'mobile';
    if (device.includes('tablet') || device.includes('ipad')) return 'tablet';
    if (device.includes('desktop')) return 'desktop';
    
    return 'unknown';
  }

  // Parsing helpers for existing session data
  private parseDeviceName(deviceInfo: string): string {
    try {
      const info = JSON.parse(deviceInfo);
      return info.name || 'جهاز غير معروف';
    } catch {
      return 'جهاز غير معروف';
    }
  }

  private parseDeviceType(deviceInfo: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    try {
      const info = JSON.parse(deviceInfo);
      return info.type || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private parseBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private parseOS(userAgent: string): string {
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone')) return 'iOS';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
  }
}

export const deviceManagerService = DeviceManagerService.getInstance();

