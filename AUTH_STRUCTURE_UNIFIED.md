# Unified Authentication Architecture

This document describes the unified authentication system used in the Thanawy application. The system is designed to provide a secure, consistent, and seamless authentication experience across both server-side and client-side components.

## Overview

The authentication system is built on a "Unified Auth" principle, ensuring that there is a single source of truth for authentication state, regardless of where it is accessed (Server Components, Client Components, or API Routes).

### Core Components

1.  **Server-Side (`src/auth.ts`)**:
    *   The primary entry point for server-side authentication.
    *   Used in Server Components and API Routes.
    *   Verifies tokens from HTTP-only cookies.
    *   Exports the `auth()` function.

2.  **Client-Side (`src/contexts/auth-context.tsx`)**:
    *   The primary entry point for client-side authentication.
    *   Provides the `useUnifiedAuth()` hook.
    *   Manages global auth state (user, loading, session).
    *   Handles synchronization with the server.

3.  **Service Layer (`src/lib/services/auth-service.ts`)**:
    *   Contains the core business logic for authentication.
    *   Handles database operations (Prisma).
    *   Manages JWT token creation and verification.
    *   Implements security features (rate limiting, 2FA, session management).

4.  **Unified Manager (`src/lib/auth/unified-auth-manager.ts`)**:
    *   Internal singleton class used by the client-side context.
    *   Handles complex state management, cross-tab synchronization, and automatic token refreshing.

## Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Client Side (Browser)"]
        UI[UI Components]
        Context[Auth Context]
        Manager[Unified Auth Manager]
        
        UI -->|useUnifiedAuth| Context
        Context -->|Internal| Manager
        Manager -->|Sync| LocalStorage[Local Storage]
        Manager -->|Broadcast| Tabs[Other Tabs]
    end

    subgraph Server ["Server Side (Next.js)"]
        API[API Routes]
        AuthFn[auth() Helper]
        Service[Auth Service]
        DB[(Database)]
        
        Manager -->|Fetch /api/auth/*| API
        API -->|Call| Service
        AuthFn -->|Call| Service
        Service -->|Query| DB
    end

    subgraph Security ["Security Layer"]
        Cookies[HTTP-Only Cookies]
        JWT[JWT Tokens]
        
        API -.->|Set/Read| Cookies
        Service -.->|Sign/Verify| JWT
    end
```

## Data Flow

### Login Flow
1.  User submits credentials via `EnhancedLoginForm`.
2.  `useLoginSubmission` hook calls `loginUser` API client.
3.  Request sent to `/api/auth/login`.
4.  `LoginService` validates credentials and checks 2FA.
5.  On success, `authService` creates session and tokens.
6.  Tokens are set as **HTTP-Only Cookies**.
7.  Client receives success response and updates `UnifiedAuthManager`.

### Session Synchronization
*   **Initial Load**: `UnifiedAuthManager` checks `/api/auth/me` to validate session from cookies.
*   **Tab Sync**: Changes in one tab are broadcasted to others via `BroadcastChannel`.
*   **Token Refresh**: `UnifiedAuthManager` automatically calls `/api/auth/refresh` before token expiry.

## File Structure

| Path | Purpose |
|------|---------|
| `src/auth.ts` | Server-side export (Server Components) |
| `src/contexts/auth-context.tsx` | Client-side provider (Client Components) |
| `src/lib/services/auth-service.ts` | Core logic and DB operations |
| `src/app/api/auth/*` | API Endpoints |
| `src/app/(auth)/*` | Authentication Pages |

## Security Features

*   **HTTP-Only Cookies**: Prevents XSS attacks accessing tokens.
*   **CSRF Protection**: Handled via SameSite cookie attributes and Next.js headers.
*   **Rate Limiting**: Built-in protection against brute-force attacks.
*   **Device Fingerprinting**: Tracks and validates user devices.
*   **Adaptive Auth**: Step-up authentication for sensitive actions.
