# Security Advisory: Error Leakage and Rate Limiting Issues

## Overview

This document outlines two critical security issues identified in the codebase:

1. Error message leakage that could expose sensitive internal information
2. Ineffective rate limiting implementation that doesn't work in distributed environments

## Issue 1: Error Message Leakage

### Problem

Some API routes directly expose error messages to clients using patterns like:
```javascript
return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
```

This can leak sensitive information such as:
- Database connection strings
- File paths
- Internal system architecture details
- Stack traces

### Examples Found

- `src/app/api/users/register/route.ts`
- `src/app/api/reminders/route.ts`

### Solution

All error responses should use the standardized error handling approach that was implemented in `@/lib/api-utils.ts`. This ensures:
1. Internal error details are never exposed to clients
2. All error messages are generic and safe
3. Errors are properly logged on the server

#### Before (Insecure):
```typescript
catch (e: any) {
  return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
}
```

#### After (Secure):
```typescript
import { handleApiError } from '@/lib/api-utils';

catch (error) {
  return handleApiError(error);
}
```

## Issue 2: Ineffective Rate Limiting

### Problem

Some authentication routes use local JavaScript Maps for rate limiting:
```javascript
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();
```

This approach has several limitations:
1. Not shared across multiple server instances
2. Data loss on server restart
3. No persistence across deployments
4. Memory leaks over time

### Examples Found

- `src/app/api/auth/login/route.ts`
- Multiple other auth routes

### Solution

Replace local Map-based rate limiting with Redis-based implementation using the existing `RateLimitingService` in `@/lib/rate-limiting-service.ts`.

#### Before (Ineffective):
```typescript
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

// Check rate limiting
const rateLimitInfo = rateLimitStore.get(clientId);
// ... local logic
```

#### After (Effective):
```typescript
import { rateLimitingService } from '@/lib/rate-limiting-service';

// Check rate limiting using Redis
const rateLimitResult = await rateLimitingService.checkRateLimit(clientId, {
  windowMs: RATE_LIMIT_WINDOW,
  maxAttempts: MAX_ATTEMPTS
});
```

## Implementation Plan

### 1. Error Handling Standardization
1. Identify all routes using direct error message exposure
2. Replace with standardized error handling using `handleApiError`
3. Ensure all new routes follow the standardized approach

### 2. Rate Limiting Enhancement
1. Replace all local Map-based rate limiting with Redis-based implementation
2. Use existing `RateLimitingService` where available
3. Configure appropriate rate limiting parameters

## Benefits

1. **Improved Security**: Prevents information leakage through error messages
2. **Scalability**: Rate limiting works correctly across multiple server instances
3. **Persistence**: Rate limiting data survives server restarts
4. **Reliability**: System continues to work even during Redis outages (fail-open approach)

## References

- See `API_STANDARDIZATION.md` for error handling guidelines
- See `RATE_LIMITING.md` for rate limiting implementation details
- See `PERFORMANCE_IMPROVEMENTS.md` for related improvements