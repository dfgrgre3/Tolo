# Centralized Services Documentation

This document explains how to use the unified cache and authentication services that have been implemented for centralization.

## Cache Service

The `CacheService` provides a single, unified interface for all caching operations in the application.

### Basic Usage

```typescript
import { cacheService } from '@/lib/cache-service';

// Set data in cache
await cacheService.set('user:123', { name: 'John', email: 'john@example.com' }, {
  ttl: 300, // 5 minutes
  tags: ['user:123', 'users']
});

// Get data from cache
const user = await cacheService.get<{ name: string; email: string }>('user:123');
if (user) {
  console.log(user.name);
}

// Get or set pattern (fetch if not cached)
const userData = await cacheService.getOrSet(
  'user:123',
  async () => {
    // Fetch from database
    return await prisma.user.findUnique({ where: { id: '123' } });
  },
  { ttl: 600, tags: ['user:123'] }, // 10 minutes
  'user'
);
```

### Advanced Features

#### Namespaced Caching
```typescript
// Use different namespaces for different types of data
await cacheService.set('profile', userData, { ttl: 300 }, 'user');
await cacheService.set('settings', settings, { ttl: 1800 }, 'preferences');

// Invalidate by namespace
await cacheService.invalidatePattern('user:*');
```

#### Tag-based Invalidation
```typescript
// Set with tags
await cacheService.set('user:123', userData, {
  tags: ['user:123', 'users', 'active'],
  ttl: 300
});

// Invalidate all cache entries with a specific tag
await cacheService.invalidateByTag('user:123');
await cacheService.invalidateByTag('users');
```

#### Batch Operations
```typescript
// Get multiple keys
const [user1, user2, user3] = await cacheService.mget(
  ['user:1', 'user:2', 'user:3']
);

// Set multiple keys
await cacheService.mset({
  'user:1': user1Data,
  'user:2': user2Data,
  'user:3': user3Data
}, { ttl: 300, tags: ['users'] });
```

#### User-specific Operations
```typescript
// Get user courses with automatic caching
const courses = await cacheService.getUserCourses('user123');

// Get user progress with automatic caching
const progress = await cacheService.getUserProgress('user123');

// Invalidate all user cache
await cacheService.invalidateUserCache('user123');
```

#### Educational Content Caching
```typescript
// Get educational data with caching
const subjects = await cacheService.getEducationalData('subjects', 50);
const courses = await cacheService.getEducationalData('courses', 20);

// Cache specific subject
await cacheService.cacheSubject('subject123', subjectData);

// Invalidate educational cache
await cacheService.invalidateEducationalCache('subjects');
```

## Authentication Service

The `AuthService` provides a single, unified interface for all authentication operations.

### Basic Usage

```typescript
import { authService } from '@/lib/auth-service';

// Login user
const loginResult = await authService.login(
  'user@example.com',
  'password123',
  req.headers.get('user-agent') || 'unknown',
  authService.getClientIP(req)
);

if (loginResult.isValid) {
  console.log('Login successful:', loginResult.user);
  // Use loginResult.accessToken and loginResult.refreshToken
} else {
  console.error('Login failed:', loginResult.error);
}

// Verify token
const verification = await authService.verifyToken(token);
if (verification.isValid) {
  console.log('Valid user:', verification.user);
}

// Refresh token
const refreshResult = await authService.refreshAccessToken(
  refreshToken,
  userAgent,
  ip
);
```

### Advanced Features

#### Token Management
```typescript
// Create tokens for user
const { accessToken, refreshToken } = await authService.createTokens({
  id: 'user123',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'user'
}, sessionId);

// Verify token from request
const verification = await authService.verifyTokenFromInput(req);
if (verification.isValid) {
  // User is authenticated
}
```

#### Session Management
```typescript
// Create session
const session = await authService.createSession(
  'user123',
  userAgent,
  ip
);

// Delete session (logout)
await authService.logout(sessionId);

// Delete all user sessions (logout from all devices)
await authService.logoutAll('user123');
```

#### User Management
```typescript
// Find user by email
const user = await authService.findUserByEmail('user@example.com');

// Find user by ID
const user = await authService.findUserById('user123');

// Update last login
await authService.updateLastLogin('user123');

// Register new user
const registerResult = await authService.register(
  'newuser@example.com',
  'password123',
  'New User'
);
```

#### Security Features
```typescript
// Log security event
await authService.logSecurityEvent(
  userId,
  'login_success',
  ip,
  { userAgent, deviceInfo }
);

// Check if user is rate limited
const isLimited = await authService.isRateLimited(clientId);
if (isLimited) {
  // Handle rate limiting
}

// Validate user role
const hasAccess = await authService.validateUserRole(
  'user123',
  ['admin', 'moderator']
);
```

#### Server-side Authentication Check
```typescript
// Get current authenticated user in server components
const authResult = await authService.getCurrentUser();
if (authResult.isValid) {
  console.log('Authenticated user:', authResult.user);
}
```

## Migration Guide

### From Old Cache Services

**Before:**
```typescript
import { getOrSetEnhanced } from '@/lib/cache-service-enhanced';

const data = await getOrSetEnhanced('key', fetchFn, 300);
```

**After:**
```typescript
import { cacheService } from '@/lib/cache-service';

const data = await cacheService.getOrSet('key', fetchFn, { ttl: 300 });
```

### From Old Auth Services

**Before:**
```typescript
import { verifyToken } from '@/lib/auth-enhanced';

const decoded = verifyToken(req);
```

**After:**
```typescript
import { authService } from '@/lib/auth-service';

const verification = await authService.verifyTokenFromInput(req);
if (verification.isValid) {
  // Use verification.user
}
```

## Benefits of Centralization

1. **Single Source of Truth**: All caching and authentication logic is centralized
2. **Consistent API**: Same interface across the entire application
3. **Better Performance**: Optimized operations with proper metrics
4. **Enhanced Security**: Centralized security event logging
5. **Easier Maintenance**: Changes only need to be made in one place
6. **Better Testing**: Easier to mock and test services
7. **Improved Monitoring**: Built-in metrics and performance tracking

## Best Practices

### Cache Usage
- Use descriptive cache keys with namespaces
- Set appropriate TTL values based on data volatility
- Use tags for efficient invalidation
- Monitor cache hit rates and performance metrics

### Authentication Usage
- Always verify tokens before processing requests
- Log security events for audit trails
- Use rate limiting to prevent abuse
- Validate user roles for authorization
- Handle token refresh properly

### Error Handling
- Always handle cache failures gracefully
- Implement fallback mechanisms for critical operations
- Log errors for monitoring and debugging
- Use proper error types and messages
