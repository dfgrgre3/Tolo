# Admin Integration - ملخص العملية

## Overview / نظرة عامة
This document describes the integration of the separate `admin` project (port 3001) into the main `thanawy` project (port 3000) as a unified single Next.js application.

يصف هذا المستند دمج مشروع `admin` المستقل (المنفذ 3001) في مشروع `thanawy` الرئيسي (المنفذ 3000) كتطبيق Next.js موحد واحد.

## Architecture Before / البنية قبل الدمج

```
┌─────────────────┐
│  thanawy        │ Port 3000
│  (Frontend)     │ ├── ClerkProvider (root)
│                 │ ├── AuthProvider (custom JWT)
│                 │ └── /admin (proxy to backend)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  backend        │ Port 8082
│  (Go/Node API)  │
└─────────────────┘

┌─────────────────┐
│  admin          │ Port 3001
│  (Separate App) │ ├── AuthProvider (custom JWT)
│                 │ ├── /admin (full panel)
│                 │ └── /api/auth/admin-login
└─────────────────┘
         │
         ▼
   (same backend)
```

## Architecture After / البنية بعد الدمج

```
┌─────────────────────────────────────────────┐
│  thanawy (Unified)                          │ Port 3000
│  ┌──────────────────────────────────────┐  │
│  │ ClerkProvider (root)                  │  │
│  │ ├── AuthProvider (with adminLogin)    │  │
│  │ ├── (auth) routes - login/register    │  │
│  │ ├── (admin) routes - full admin panel │  │
│  │ │   ├── /admin (dashboard)            │  │
│  │ │   ├── /admin/users                  │  │
│  │ │   ├── /admin/courses                │  │
│  │ │   ├── /admin/exams                  │  │
│  │ │   └── ... 142 pages total           │  │
│  │ └── /api/* proxied to backend         │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  backend        │ Port 8082
└─────────────────┘
```

## Files Integrated / الملفات المدمجة

### Pages (142 files)
- `src/app/(admin)/admin/*` - All admin pages
- `src/app/(admin)/layout.tsx` - Admin layout with AdminGuard
- `src/app/(admin)/admin/page.tsx` - Admin dashboard
- `src/app/(admin)/admin/users/*` - User management
- `src/app/(admin)/admin/courses/*` - Course management
- `src/app/(admin)/admin/exams/*` - Exam management
- `src/app/(admin)/admin/payments/*` - Payment management
- `src/app/(admin)/admin/settings/*` - Settings
- And more...

### Components (92 files)
- `src/components/admin/*` - All admin-specific components
- `src/components/admin/dashboard/*` - Dashboard widgets
- `src/components/admin/layout/*` - Admin layout components
- `src/components/admin/ui/*` - Admin UI primitives
- `src/components/admin/broadcast/*` - Broadcast system
- `src/components/admin/courses/*` - Course management UI
- `src/components/admin/monitoring/*` - Monitoring tools
- And more...

### Libraries
- `src/lib/admin-audit.ts` - Admin audit logging
- `src/lib/admin-panel-route-access.ts` - Route access control
- `src/lib/auth/admin-panel-roles.ts` - Role definitions
- `src/lib/api/admin-api.ts` - Admin API client
- `src/lib/public-cache/admin-cache-paths.ts` - Cache management

### Services & Hooks
- `src/services/ab-testing-service.ts`
- `src/services/notification-queue-service.ts`
- `src/services/auth/*` - Auth services
- `src/hooks/*` - Custom hooks
- `src/contexts/*` - React contexts

## Key Changes / التغييرات الرئيسية

### 1. proxy.ts (Frontend Middleware)
```diff
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
- '/admin(.*)',
  '/profile(.*)',
  '/my-courses(.*)',
  '/billing(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
+ '/admin-login(.*)',
  '/sign-in(.*)',
  ...
]);
```

**Why**: Admin section uses JWT-based custom auth via the `(admin)` layout's `AdminGuard`. It must NOT be protected by Clerk (otherwise users would need to authenticate twice).

### 2. auth-context.tsx (Unified Auth)
Added new `adminLogin` method that:
- Calls `/api/auth/admin-login` endpoint
- Validates the user has staff/admin role
- Auto-logs-out non-admin users
- Returns clear error messages

```typescript
const adminLogin = useCallback(async (
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
  // ... validates role and authenticates
});
```

### 3. admin-login page
Updated to use the new `adminLogin` method:
```typescript
const { adminLogin, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
```

### 4. API Routes
Added `adminLogin` to `apiRoutes.auth`:
```typescript
auth: {
  login: "/api/auth/login",
  adminLogin: "/api/auth/admin-login",
  ...
}
```

## Auth Flow / تدفق المصادقة

### Regular User Login
1. User visits `/login`
2. Form submits to `useAuth().login()`
3. POST `/api/auth/login` (proxied to backend)
4. Backend authenticates and sets cookies
5. Client fetches `/api/auth/me` to hydrate user
6. Redirect to original destination

### Admin User Login
1. User visits `/admin-login`
2. Form submits to `useAuth().adminLogin()`
3. POST `/api/auth/admin-login` (proxied to backend)
4. Backend authenticates and sets cookies
5. Client fetches `/api/auth/me` to hydrate user
6. **Client validates user has staff/admin role** (using `isStaffAdminPanelRole`)
7. If non-admin: automatic logout + error
8. If admin: redirect to `/admin`

### Admin Page Access (after login)
1. User navigates to `/admin` or any `/admin/*` page
2. `(admin)/layout.tsx`'s `AdminGuard` component:
   - Checks `useAuth()` state
   - If not authenticated: redirect to `/admin-login`
   - If authenticated but not staff: redirect to `/`
   - Otherwise: render children with `AdminLayout`

## Build & Test / البناء والاختبار

### Scripts
- `scripts/integrate-admin.ps1` - Initial file integration script
- `scripts/append-auth-context.ps1` - Helper to complete auth-context.tsx
- `scripts/update-admin-login.ps1` - Update admin-login page to use adminLogin

### Run the project
```bash
cd frontend
npm install
npm run dev
```

Access:
- Main site: http://localhost:3000
- Admin login: http://localhost:3000/admin-login
- Admin dashboard: http://localhost:3000/admin (after login)

## Backend Requirements / متطلبات الـ Backend

The backend must expose the following endpoints:
- `POST /api/auth/login` - Regular login
- `POST /api/auth/admin-login` - Admin login (returns 403 if not staff)
- `POST /api/auth/logout` - Logout
- `POST /api/auth/2fa/verify` - 2FA verification
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `GET /api/admin/*` - All admin endpoints

## Environment Variables
Required in `.env`:
```
INTERNAL_API_URL=http://127.0.0.1:8082
NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Notes / ملاحظات

1. The old `admin` project (D:\admin) is no longer needed. You can keep it as a reference or delete it.
2. The Clerk auth is still used for regular user pages (login, register, etc.) and protected user routes.
3. The admin section has its own auth flow (JWT-based) and does not depend on Clerk.
4. The backend is the single source of truth for both auth methods.
5. All admin pages work with the same backend API as before.
