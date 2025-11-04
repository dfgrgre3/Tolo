/**
 * IP Blocking Service
 * Provides IP-based blocking for security purposes
 */

interface BlockedIP {
  ip: string;
  reason: string;
  blockedUntil: number; // Unix timestamp
  attempts: number;
}

export class IPBlockingService {
  private static instance: IPBlockingService;
  private blockedIPs: Map<string, BlockedIP>;
  private suspiciousIPs: Map<string, { count: number; lastAttempt: number }>;
  
  // Configuration
  private readonly MAX_ATTEMPTS_BEFORE_BLOCK = 10;
  private readonly BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private readonly SUSPICIOUS_THRESHOLD = 5;
  private readonly SUSPICIOUS_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.blockedIPs = new Map();
    this.suspiciousIPs = new Map();
    
    // Cleanup expired blocks every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  public static getInstance(): IPBlockingService {
    if (!IPBlockingService.instance) {
      IPBlockingService.instance = new IPBlockingService();
    }
    return IPBlockingService.instance;
  }

  /**
   * Check if an IP is blocked
   */
  isBlocked(ip: string): { blocked: boolean; reason?: string; blockedUntil?: Date } {
    const blocked = this.blockedIPs.get(ip);
    
    if (!blocked) {
      return { blocked: false };
    }

    // Check if block has expired
    if (Date.now() > blocked.blockedUntil) {
      this.blockedIPs.delete(ip);
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: blocked.reason,
      blockedUntil: new Date(blocked.blockedUntil),
    };
  }

  /**
   * Record a failed attempt from an IP
   */
  recordFailedAttempt(ip: string, reason: string = 'Failed login attempt'): void {
    // Update suspicious IPs tracking
    const suspicious = this.suspiciousIPs.get(ip) || { count: 0, lastAttempt: 0 };
    
    // Reset count if window expired
    if (Date.now() - suspicious.lastAttempt > this.SUSPICIOUS_WINDOW_MS) {
      suspicious.count = 0;
    }
    
    suspicious.count++;
    suspicious.lastAttempt = Date.now();
    this.suspiciousIPs.set(ip, suspicious);

    // Check if should be blocked
    if (suspicious.count >= this.MAX_ATTEMPTS_BEFORE_BLOCK) {
      this.blockIP(ip, reason);
      return;
    }

    // Mark as suspicious if threshold reached
    if (suspicious.count >= this.SUSPICIOUS_THRESHOLD) {
      // Log suspicious activity (could be extended to notify admins)
      console.warn(`Suspicious activity detected from IP: ${ip} (${suspicious.count} attempts)`);
    }
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason: string = 'Too many failed attempts'): void {
    const blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
    
    this.blockedIPs.set(ip, {
      ip,
      reason,
      blockedUntil,
      attempts: this.suspiciousIPs.get(ip)?.count || 0,
    });

    // Clear suspicious tracking since IP is now blocked
    this.suspiciousIPs.delete(ip);
    
    console.warn(`IP blocked: ${ip} until ${new Date(blockedUntil).toISOString()}. Reason: ${reason}`);
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
  }

  /**
   * Check if IP is suspicious (but not yet blocked)
   */
  isSuspicious(ip: string): boolean {
    const suspicious = this.suspiciousIPs.get(ip);
    
    if (!suspicious) {
      return false;
    }

    // Check if window expired
    if (Date.now() - suspicious.lastAttempt > this.SUSPICIOUS_WINDOW_MS) {
      this.suspiciousIPs.delete(ip);
      return false;
    }

    return suspicious.count >= this.SUSPICIOUS_THRESHOLD;
  }

  /**
   * Get suspicious activity count for an IP
   */
  getSuspiciousCount(ip: string): number {
    const suspicious = this.suspiciousIPs.get(ip);
    
    if (!suspicious) {
      return 0;
    }

    // Check if window expired
    if (Date.now() - suspicious.lastAttempt > this.SUSPICIOUS_WINDOW_MS) {
      this.suspiciousIPs.delete(ip);
      return 0;
    }

    return suspicious.count;
  }

  /**
   * Cleanup expired blocks
   */
  private cleanup(): void {
    const now = Date.now();
    const ipsToDelete: string[] = [];

    for (const [ip, blocked] of this.blockedIPs.entries()) {
      if (now > blocked.blockedUntil) {
        ipsToDelete.push(ip);
      }
    }

    ipsToDelete.forEach(ip => this.blockedIPs.delete(ip));

    // Cleanup suspicious IPs with expired windows
    for (const [ip, suspicious] of this.suspiciousIPs.entries()) {
      if (now - suspicious.lastAttempt > this.SUSPICIOUS_WINDOW_MS) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      blockedCount: this.blockedIPs.size,
      suspiciousCount: this.suspiciousIPs.size,
    };
  }

  /**
   * Get all blocked IPs (for admin use)
   */
  getBlockedIPs(): Array<{ ip: string; reason: string; blockedUntil: Date; attempts: number }> {
    const now = Date.now();
    return Array.from(this.blockedIPs.values())
      .filter(blocked => now < blocked.blockedUntil)
      .map(blocked => ({
        ip: blocked.ip,
        reason: blocked.reason,
        blockedUntil: new Date(blocked.blockedUntil),
        attempts: blocked.attempts,
      }));
  }
}

// Export singleton instance
export const ipBlockingService = IPBlockingService.getInstance();

