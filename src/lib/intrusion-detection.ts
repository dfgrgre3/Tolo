import axios from 'axios';
import { EventEmitter } from 'events';

export interface IntrusionEvent {
  type: 'failed_attempt' | 'suspicious_activity' | 'block';
  ip: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class IntrusionDetectionSystem extends EventEmitter {
  private attempts = new Map<string, {
    count: number;
    lastAttempt: Date;
    blockedUntil?: Date;
  }>();

  constructor(
    private config = {
      maxAttempts: 5,
      timeWindowMinutes: 15,
      blockDurationMinutes: 30,
      alertThreshold: 3
    }
  ) {
    super();
  }

  logAttempt(ip: string, metadata?: Record<string, any>): boolean {
    const now = new Date();
    let entry = this.attempts.get(ip) || { count: 0, lastAttempt: now };

    // Reset if time window has passed
    if (this.isTimeWindowExpired(entry.lastAttempt, now)) {
      entry = { count: 0, lastAttempt: now };
    }

    // Check if IP is blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      this.emit('block', { 
        type: 'block', 
        ip, 
        timestamp: now,
        metadata 
      });
      return false;
    }

    entry.count++;
    entry.lastAttempt = now;
    this.attempts.set(ip, entry);

    // Trigger events based on attempt count
    if (entry.count >= this.config.alertThreshold) {
      this.emit('suspicious_activity', {
        type: 'suspicious_activity',
        ip,
        timestamp: now,
        attempts: entry.count,
        metadata
      });
    }

    if (entry.count >= this.config.maxAttempts) {
      entry.blockedUntil = new Date(
        now.getTime() + this.config.blockDurationMinutes * 60000
      );
      this.attempts.set(ip, entry);
      
      this.emit('block', { 
        type: 'block', 
        ip, 
        timestamp: now,
        metadata 
      });
      return false;
    }

    this.emit('failed_attempt', {
      type: 'failed_attempt',
      ip,
      timestamp: now,
      attempts: entry.count,
      metadata
    });

    return true;
  }

  private isTimeWindowExpired(lastAttempt: Date, currentTime: Date): boolean {
    return (
      currentTime.getTime() - lastAttempt.getTime() >
      this.config.timeWindowMinutes * 60000
    );
  }

  resetAttempts(ip: string): void {
    this.attempts.delete(ip);
  }

  async sendAlert(event: IntrusionEvent): Promise<void> {
    // Implementation for sending alerts to monitoring system
    await axios.post('/api/security/alerts', event);
  }
}
