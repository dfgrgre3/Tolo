# Redis-based Rate Limiting Implementation

This document explains how rate limiting has been implemented using Redis instead of in-memory Maps for better security and scalability.

## Overview

Previously, the authentication system used JavaScript Maps to track login attempts, which had several limitations:
1. Not shared across multiple server instances
2. Data loss on server restart
3. No persistence across deployments
4. Memory leaks over time

The new implementation uses Redis to overcome these limitations.

## Key Components

### 1. Rate Limiting Service (`src/lib/rate-limiting-service.ts`)

A dedicated service that handles all rate limiting operations using Redis:

- `checkRateLimit`: Check if a client has exceeded rate limits
- `recordFailedAttempt`: Record a failed login attempt
- `resetRateLimit`: Reset rate limiting after successful authentication
- `getRateLimitStatus`: Get current rate limiting status

### 2. Redis Sorted Sets for Tracking

The implementation uses Redis sorted sets to track login attempts:
- Key format: `rate_limit:{clientId}`
- Values: Timestamps of login attempts
- Scores: Same timestamps for easy time-based querying

### 3. Account Lockout Mechanism

When a client exceeds the maximum number of attempts:
- Key format: `lockout:{clientId}`
- Value: Unix timestamp when lockout expires
- Duration: Configurable (default: 30 minutes)

## Implementation Details

### Rate Limiting Algorithm

We use a sliding window algorithm with Redis sorted sets:

1. Add current attempt timestamp to sorted set
2. Remove timestamps outside the time window
3. Count remaining timestamps
4. Compare count with maximum allowed attempts

### Client Identification

Clients are identified by a combination of:
- IP address (from `x-forwarded-for` or `x-real-ip` headers)
- User Agent string

This provides a balance between security and usability.

### Configuration

Rate limiting can be configured with:
- `windowMs`: Time window in milliseconds (default: 15 minutes)
- `maxAttempts`: Maximum attempts allowed (default: 5)
- `lockoutMs`: Account lockout duration (default: 30 minutes)

## Security Benefits

1. **Persistence**: Rate limiting data survives server restarts
2. **Scalability**: Shared across all server instances
3. **Atomic Operations**: Uses Redis transactions for data consistency
4. **Account Protection**: Automatic lockout after too many failed attempts
5. **Memory Efficiency**: Automatic expiration of old data

## API Integration

The rate limiting service is integrated into:
- `/api/auth/login` route
- `/api/auth/login-enhanced` route
- `AuthService` class methods

## Fail-safe Design

The implementation follows a "fail open" approach:
- If Redis is unavailable, rate limiting is bypassed
- Errors are logged but don't block legitimate requests
- System continues to work even during Redis outages

## Monitoring and Logging

All rate limiting events are logged for security monitoring:
- Failed attempts
- Account lockouts
- Rate limit violations

## Future Improvements

1. **Adaptive Rate Limiting**: Adjust limits based on client behavior
2. **Whitelisting**: Allow trusted IPs to bypass rate limiting
3. **Captcha Integration**: Require CAPTCHA after certain number of attempts
4. **Distributed Rate Limiting**: Coordinate limits across multiple services
5. **Advanced Analytics**: Identify and block malicious patterns