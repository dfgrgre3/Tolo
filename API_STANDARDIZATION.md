# API Standardization Guidelines

This document outlines the standardized approaches for authentication and error handling across all API routes in the Thanawy platform.

## Authentication Standardization

Previously, we had two different authentication methods:
1. `verifyToken` from `@/lib/auth` - Simple JWT verification
2. `verifyAccessToken` from `@/lib/auth-enhanced` - JWT verification with session checking

We've now unified these approaches into a single `AuthService` in `@/lib/auth-service.ts`.

### Using AuthService

Instead of importing different verification functions, all routes should now use:

```typescript
import { AuthService } from '@/lib/auth-service';

// Simple JWT verification
const decodedToken = await AuthService.verifyToken(request);

// JWT verification with session checking
const decodedToken = await AuthService.verifyToken(request, { checkSession: true });
```

### Token Structure

The unified token verification returns a consistent structure:

```typescript
interface DecodedToken {
  userId: string;
  email?: string;
  sessionId?: string; // Only present in session-based tokens
  exp?: number;       // Expiration timestamp
  iat?: number;       // Issued at timestamp
}
```

## Error Handling Standardization

Previously, error handling was inconsistent:
- Some routes returned error messages in Arabic
- Some routes returned error messages in English
- Some routes leaked internal error details to the client

We've now created a standardized error handling approach using `@/lib/api-utils.ts`.

### Standardized Response Format

All API responses now follow a consistent format:

```typescript
// Success response
{
  data: T,        // The actual data
  message?: string, // Optional message
  status: number   // HTTP status code
}

// Error response
{
  error: string,   // User-friendly error message (always in English)
  code?: string,   // Machine-readable error code
  status: number   // HTTP status code
}
```

### Using Standardized Error Handling

Instead of manually creating responses, use the helper functions:

```typescript
import { 
  handleApiError, 
  badRequestResponse, 
  unauthorizedResponse, 
  successResponse 
} from '@/lib/api-utils';

// Handle unexpected errors
try {
  // ... some operation
} catch (error) {
  return handleApiError(error); // Never exposes internal details
}

// Bad request with validation errors
return badRequestResponse('Invalid parameter value', 'INVALID_PARAMETER');

// Authentication errors
return unauthorizedResponse(); // Defaults to 'Unauthorized'
return unauthorizedResponse('Custom message');

// Success responses
return successResponse(data, 'Operation successful', 201);
```

### Error Security

The new `handleApiError` function ensures that:
1. Internal error details are never exposed to clients
2. All error messages are generic and safe
3. Errors are properly logged on the server

## Implementation Examples

### Before Standardization

```typescript
// Inconsistent authentication
const decodedToken = verifyToken(req); // From @/lib/auth
const decoded = await verifyAccessToken(token); // From @/lib/auth-enhanced

// Inconsistent error handling
return NextResponse.json({ error: 'خطأ في التحقق' }, { status: 401 }); // Arabic
return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 }); // Leaks details
```

### After Standardization

```typescript
// Unified authentication
const decodedToken = await AuthService.verifyToken(request, { checkSession: true });

// Standardized error handling
if (!decodedToken) {
  return unauthorizedResponse();
}

try {
  // ... some operation
} catch (error) {
  return handleApiError(error); // Never exposes internal details
}
```

## Migration Process

To migrate existing routes to the standardized approach:

1. Replace imports of `verifyToken` or `verifyAccessToken` with `AuthService`
2. Replace manual `NextResponse.json` error responses with standardized helpers
3. Wrap all catch blocks with `handleApiError`
4. Use `successResponse` for consistent success responses

## Benefits

1. **Consistency**: All routes now follow the same patterns
2. **Security**: No more leaking internal error details
3. **Maintainability**: Single source of truth for authentication and error handling
4. **Developer Experience**: Clear, predictable APIs with consistent responses
5. **Internationalization Ready**: All user-facing messages are in English and can be easily localized