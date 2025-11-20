# البنية الموحدة لنظام المصادقة
# Unified Authentication Structure

## 📋 نظرة عامة

تم توحيد نظام المصادقة بالكامل لتجنب التضارب. يوجد الآن **نقطة تصدير موحدة واحدة** لكل جانب من جوانب النظام.

## 🎯 نقاط التصدير الموحدة

### 1. للعميل (Client-Side) ⭐
**المصدر الوحيد الموثوق: `@/contexts/auth-context.tsx`**

```typescript
// ✅ صحيح - استخدم هذا
import { useUnifiedAuth, UnifiedAuthProvider } from '@/contexts/auth-context';

// ❌ خطأ - لا تستورد مباشرة
import { useUnifiedAuth } from '@/contexts/auth-context';
```

**ما يتم تصديره:**
- `useUnifiedAuth()` - Hook للمصادقة الموحدة
- `UnifiedAuthProvider` - Provider للمصادقة الموحدة
- `useAuth()` - Hook للتوافق مع الأنظمة القديمة
- `AuthProvider` - Provider للتوافق مع الأنظمة القديمة
- `User` - نوع بيانات المستخدم

### 2. للخادم (Server-Side) ⭐
**المصدر الوحيد الموثوق: `@/auth.ts`**

```typescript
// ✅ صحيح - استخدم هذا
import { auth } from '@/auth';

// ❌ خطأ - لا تستورد مباشرة
import { authService } from '@/lib/auth-service';
```

**ما يتم تصديره:**
- `auth()` - دالة للحصول على المستخدم الحالي من cookies

### 3. لـ API Routes ⭐
**المصدر الوحيد الموثوق: `@/lib/auth-service.ts`**

```typescript
// ✅ صحيح - استخدم هذا
import { authService } from '@/lib/auth-service';

// ❌ خطأ - لا تستورد من @/auth
import { auth } from '@/auth'; // هذا للـ Server Components فقط
```

**ما يتم تصديره:**
- `authService` - خدمة المصادقة الكاملة
- `hashPassword()` - تشفير كلمة المرور
- `comparePasswords()` - مقارنة كلمة المرور

## 📁 هيكل الملفات

```
src/
├── auth.ts                          # نقطة التصدير الموحدة للخادم (server-only)
├── contexts/
│   └── auth-context.tsx             # ⭐ نقطة التصدير الموحدة للعميل
├── lib/
│   ├── auth-service.ts              # الخدمة الأساسية للمصادقة (server-side)
│   ├── auth-hook-enhanced.ts        # Hook محسّن (يستخدم auth-context)
│   └── auth/
│       ├── compatibility.ts         # طبقة توافق (يستخدم auth-context)
│       └── unified-auth-manager.ts  # مدير الحالة الموحد (داخلي)
└── components/
    └── auth/
        ├── UnifiedAuthProvider.tsx  # Provider الموحد (يستخدم من auth-context)
        └── UserProvider.tsx         # Provider للتوافق (يستخدم auth-context)
```

## 🔄 تدفق البيانات

### على العميل (Client-Side):
```
Component
  ↓
useUnifiedAuth() من @/contexts/auth-context
  ↓
UnifiedAuthProvider (من auth-context)
  ↓
UnifiedAuthManager (داخلي)
  ↓
API Calls → /api/auth/*
```

### على الخادم (Server-Side):
```
Server Component / API Route
  ↓
auth() من @/auth (لـ Server Components)
  أو
authService من @/lib/auth-service (لـ API Routes)
  ↓
Database / Cookies
```

## ✅ قواعد الاستخدام

### 1. في Client Components:
```typescript
'use client';

import { useUnifiedAuth } from '@/contexts/auth-context';

export function MyComponent() {
  const { user, isAuthenticated, login, logout } = useUnifiedAuth();
  // ...
}
```

### 2. في Server Components:
```typescript
import { auth } from '@/auth';

export default async function MyPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  // ...
}
```

### 3. في API Routes:
```typescript
import { authService } from '@/lib/auth-service';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const result = await authService.verifyTokenFromRequest(request);
  if (!result.isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}
```

### 4. في Providers:
```typescript
'use client';

import { UnifiedAuthProvider } from '@/contexts/auth-context';

export function AppProviders({ children }) {
  return (
    <UnifiedAuthProvider>
      {children}
    </UnifiedAuthProvider>
  );
}
```

## 🚫 ما يجب تجنبه

### ❌ لا تستورد مباشرة من:
- `@/components/auth/UnifiedAuthProvider` - استخدم `@/contexts/auth-context` بدلاً منه
- `@/lib/auth/unified-auth-manager` - ملف داخلي، لا تستورده
- `@/lib/auth-service` في Client Components - استخدم `useUnifiedAuth` بدلاً منه

### ❌ لا تستخدم:
- استيرادات متعددة من مصادر مختلفة لنفس الوظيفة
- `useAuth` من مصادر مختلفة - استخدم `useUnifiedAuth` من `@/contexts/auth-context`

## 🔧 الملفات الداخلية (لا تستوردها مباشرة)

هذه الملفات هي تنفيذ داخلي ولا يجب استيرادها مباشرة:

- `src/components/auth/UnifiedAuthProvider.tsx` - استخدم من `@/contexts/auth-context`
- `src/lib/auth/unified-auth-manager.ts` - ملف داخلي
- `src/lib/auth/compatibility.ts` - للاستخدام الداخلي فقط

## 📝 ملاحظات مهمة

1. **نقطة واحدة للتصدير**: كل جانب له نقطة تصدير واحدة فقط
2. **لا تضارب**: جميع الملفات تستورد من نفس المصدر
3. **التوافق**: `AuthProvider` و `useAuth` متوافقة مع الأنظمة القديمة
4. **الوضوح**: التوثيق موجود في كل ملف يوضح كيفية الاستخدام

## 🎓 أمثلة عملية

### مثال 1: تسجيل الدخول
```typescript
'use client';

import { useUnifiedAuth } from '@/contexts/auth-context';

export function LoginForm() {
  const { login } = useUnifiedAuth();
  
  const handleLogin = async () => {
    // استدعاء API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    
    // تحديث الحالة
    await login(data.token, data.user, data.sessionId);
  };
  
  return <button onClick={handleLogin}>تسجيل الدخول</button>;
}
```

### مثال 2: حماية صفحة
```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  
  return <div>محتوى محمي</div>;
}
```

### مثال 3: API Route محمي
```typescript
import { authService } from '@/lib/auth-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const result = await authService.verifyTokenFromRequest(request);
  
  if (!result.isValid || !result.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({ user: result.user });
}
```

## 🔍 التحقق من التضارب

إذا كنت تريد التحقق من عدم وجود تضارب:

```bash
# البحث عن استيرادات مباشرة من UnifiedAuthProvider
grep -r "from '@/components/auth/UnifiedAuthProvider'" src/ | grep -v "auth-context.tsx"

# البحث عن استيرادات مباشرة من unified-auth-manager
grep -r "from '@/lib/auth/unified-auth-manager'" src/
```

يجب أن تكون النتائج فارغة أو فقط في `auth-context.tsx`.

## 📚 المزيد من المعلومات

- راجع التعليقات في `@/contexts/auth-context.tsx` للتفاصيل الكاملة
- راجع `@/auth.ts` لاستخدام المصادقة على الخادم
- راجع `@/lib/auth-service.ts` لاستخدام المصادقة في API Routes
