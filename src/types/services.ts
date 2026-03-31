export interface RateLimitConfig {
    windowMs: number;
    maxAttempts: number;
    lockoutMs?: number;
    failClosed?: boolean;
}

export interface RateLimitResult {
    allowed: boolean;
    attempts: number;
    remainingTime?: number;
    lockedUntil?: number;
}

export interface RateLimitService {
    checkRateLimit(clientId: string, config?: RateLimitConfig): Promise<RateLimitResult>;
    recordFailedAttempt(clientId: string, config?: RateLimitConfig): Promise<void>;
    incrementAttempts(clientId: string, config?: RateLimitConfig): Promise<void>;
    resetAttempts(clientId: string): Promise<void>;
    resetRateLimit(clientId: string): Promise<void>;
    getRateLimitStatus(clientId: string, config?: RateLimitConfig): Promise<RateLimitResult>;
}

export interface DeviceFingerprint {
    userAgent?: string;
    timezone?: string;
    language?: string;
    screen?: any;
    platform?: string;
    [key: string]: any;
}

export interface DeviceInfo {
    userAgent?: string;
    ip?: string;
    [key: string]: unknown;
}

export interface SecurityMetadata {
    reason?: string;
    sessionId?: string;
    [key: string]: unknown;
}


