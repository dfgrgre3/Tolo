/**
 * IP Blocking Service
 * Provides IP-based blocking and rate limiting
 */

import { prisma } from '@/lib/db';

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
}

const blockedIPs = new Map<string, BlockedIP>();

export interface IPBlockStatus {
  blocked: boolean;
  reason?: string;
  blockedUntil?: Date;
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): IPBlockStatus {
  const blocked = blockedIPs.get(ip);
  if (!blocked) return { blocked: false };

  // Check if block has expired
  if (blocked.expiresAt && blocked.expiresAt < new Date()) {
    blockedIPs.delete(ip);
    return { blocked: false };
  }

  return {
    blocked: true,
    reason: blocked.reason,
    blockedUntil: blocked.expiresAt
  };
}

/**
 * Block an IP address
 */
export function blockIP(ip: string, reason: string, durationMinutes?: number): void {
  const blockedAt = new Date();
  const expiresAt = durationMinutes
    ? new Date(blockedAt.getTime() + durationMinutes * 60 * 1000)
    : undefined;

  blockedIPs.set(ip, {
    ip,
    reason,
    blockedAt,
    expiresAt,
  });
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
}

/**
 * Get all blocked IPs
 */
export function getBlockedIPs(): BlockedIP[] {
  return Array.from(blockedIPs.values());
}

/**
 * Clear expired blocks
 */
export function clearExpiredBlocks(): void {
  const now = new Date();
  for (const [ip, blocked] of blockedIPs.entries()) {
    if (blocked.expiresAt && blocked.expiresAt < now) {
      blockedIPs.delete(ip);
    }
  }
}


const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

/**
 * Record a failed attempt from an IP
 */
export function recordFailedAttempt(ip: string, reason: string): void {
  const now = new Date();
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
  
  // Reset count if last attempt was long ago (e.g. 1 hour)
  if (now.getTime() - attempts.lastAttempt.getTime() > 3600000) {
    attempts.count = 0;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  failedAttempts.set(ip, attempts);

  if (attempts.count >= 10) {
    blockIP(ip, `Too many failed attempts: ${reason}`, 30); // Block for 30 mins
  }
}

/**
 * IP Blocking Service
 */
export const ipBlockingService = {
  isBlocked: isIPBlocked,
  block: blockIP,
  unblock: unblockIP,
  getBlocked: getBlockedIPs,
  clearExpired: clearExpiredBlocks,
  recordFailedAttempt,
};

// Clear expired blocks every 5 minutes
if (typeof window === 'undefined') {
  setInterval(clearExpiredBlocks, 5 * 60 * 1000);
}
