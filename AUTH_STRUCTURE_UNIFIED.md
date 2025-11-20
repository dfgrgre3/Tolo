# 📚 البنية الموحدة لنظام المصادقة

## ⭐ نظرة عامة

هذا المستند يشرح البنية الموحدة لنظام المصادقة بدون أي تضارب. النظام مقسم بوضوح بين **الخادم (Server-Side)** و **العميل (Client-Side)**.

---

## 🏗️ البنية الموحدة

### 📁 CLIENT-SIDE (العميل)

```
src/contexts/auth-context.tsx ⭐
  └─> نقطة التصدير الموحدة (Single Source of Truth)
      └─> src/components/auth/UnifiedAuthProvider.tsx
          └─> src/lib/auth/unified-auth-manager.ts
              └─> إدارة الحالة والمزامنة
```

**الاستخدام:**
```typescript
// ✅ في Client Components
import { useUnifiedAuth, UnifiedAuthProvider } from '@/contexts/auth-context'

// ✅ في Providers
<UnifiedAuthProvider>
  <App />
</UnifiedAuthProvider>
```

---

### 📁 SERVER-SIDE (الخادم)

```
src/auth.ts ⭐
  └─> نقطة التصدير الموحدة (server-only)
      └─> src/lib/auth-service.ts
          └─> الخدمة الأساسية للمصادقة
```

**الاستخدام:**
```typescript
// ✅ في Server Components
import { auth } from '@/auth'

// ✅ في API Routes
import { authService } from '@/lib/auth-service'
```

---

### 🔄 طبقات التوافق (Compatibility Layers)

هذه الملفات تعمل كطبقات توافق فقط للأنظمة القديمة:

1. **src/components/auth/UserProvider.tsx**
   - يعتمد على `UnifiedAuthProvider` داخلياً
   - يوفر واجهة متوافقة مع `useAuth` القديم

2. **src/lib/auth/compatibility.ts**
   - يعتمد على `useUnifiedAuth` داخلياً
   - يوفر `useAuthCompatibility()` للتوافق

3. **src/lib/auth-hook-enhanced.ts**
   - يعتمد على `useUnifiedAuth` داخلياً
   - يوفر `useEnhancedAuth()` للوظائف الإضافية (2FA، Social Login)

---

## 📖 دليل الاستخدام

### ✅ للاستخدام الأساسي (موصى به)

#### في Client Components:
```typescript
import { useUnifiedAuth } from '@/contexts/auth-context'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useUnifiedAuth()
  
  // استخدام الحالة والوظائف
}
```

#### في Server Components:
```typescript
import { auth } from '@/auth'

export default async function ServerComponent() {
  const session = await auth()
  
  if (!session) {
    return <div>غير مسجل دخول</div>
  }
  
  return <div>مرحباً {session.user.name}</div>
}
```

#### في API Routes:
```typescript
import { authService } from '@/lib/auth-service'

export async function POST(request: NextRequest) {
  const result = await authService.verifyTokenFromRequest(request)
  
  if (!result.isValid) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // استخدام result.user
}
```

---

### 🔄 للتوافق مع الكود القديم

إذا كان لديك كود قديم يستخدم `useAuth` أو `AuthProvider`:

```typescript
// ⚠️ للتوافق فقط - موصى بالترقية إلى useUnifiedAuth
// ❌ لا تستورد من @/contexts/auth-context (غير متوفر)
// ✅ استورد مباشرة من الملفات القديمة للترقية التدريجية:

import { useAuth } from '@/hooks/use-auth'  // يستخدم useUnifiedAuth داخلياً
import { AuthProvider } from '@/components/auth/UserProvider'  // يتطلب UnifiedAuthProvider كـ parent

// ⚠️ يجب أن يكون UnifiedAuthProvider موجوداً كـ parent
<UnifiedAuthProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</UnifiedAuthProvider>
```

**⚠️ مهم:** الكود القديم (`useAuth`, `AuthProvider`) لا يتم تصديره من `@/contexts/auth-context` لتجنب التضارب. إذا كنت تحتاج للتوافق، استورد مباشرة من الملفات المذكورة أعلاه، لكن يُنصح بشدة بالترقية إلى `useUnifiedAuth`.

---

## 🎯 نقاط التصدير الموحدة

### ⭐ CLIENT-SIDE: `@/contexts/auth-context`

**ما يتم تصديره:**
- `useUnifiedAuth()` - Hook الأساسي ⭐
- `UnifiedAuthProvider` - Provider الموحد ⭐
- `UnifiedAuthContext` - Context للاستخدام المباشر
- `User` - نوع بيانات المستخدم

**ما لا يتم تصديره (لتجنب التضارب):**
- ❌ `useAuth()` - استخدم `useUnifiedAuth()` بدلاً منه
- ❌ `AuthProvider` - استخدم `UnifiedAuthProvider` بدلاً منه

**ما لا يتم تصديره:**
- ❌ لا تستورد من `@/components/auth/UnifiedAuthProvider` مباشرة
- ❌ لا تستورد من `@/lib/auth/unified-auth-manager` مباشرة

---

### ⭐ SERVER-SIDE: `@/auth`

**ما يتم تصديره:**
- `auth()` - دالة للحصول على المستخدم الحالي

**ما لا يتم تصديره:**
- ❌ لا تستورد من `@/lib/auth-service` مباشرة في Server Components
- ✅ استخدم `@/lib/auth-service` فقط في API Routes

---

## 📋 الملفات الرئيسية

### CLIENT-SIDE

| الملف | الوصف | الاستخدام |
|------|------|----------|
| `src/contexts/auth-context.tsx` | نقطة التصدير الموحدة ⭐ | **استخدم هذا** |
| `src/components/auth/UnifiedAuthProvider.tsx` | Provider الموحد | داخلي |
| `src/lib/auth/unified-auth-manager.ts` | مدير الحالة | داخلي |
| `src/lib/auth-hook-enhanced.ts` | Hook محسّن (2FA، Social) | اختياري |
| `src/lib/auth/compatibility.ts` | طبقة توافق | للتوافق فقط |
| `src/components/auth/UserProvider.tsx` | Provider قديم | للتوافق فقط |

### SERVER-SIDE

| الملف | الوصف | الاستخدام |
|------|------|----------|
| `src/auth.ts` | نقطة التصدير الموحدة ⭐ | **استخدم هذا** |
| `src/lib/auth-service.ts` | الخدمة الأساسية | في API Routes |

### API CLIENT

| الملف | الوصف | الاستخدام |
|------|------|----------|
| `src/lib/api/auth-client.ts` | عميل API للعميل | في Client Components |

---

## 🔍 كيفية التحقق من عدم وجود تضارب

### ✅ علامات النظام الموحد:

1. **نقطة تصدير واحدة للعميل:**
   - ✅ `@/contexts/auth-context` فقط
   - ❌ لا تستورد من ملفات داخلية مباشرة

2. **نقطة تصدير واحدة للخادم:**
   - ✅ `@/auth` للـ Server Components
   - ✅ `@/lib/auth-service` للـ API Routes

3. **طبقات التوافق:**
   - ✅ تعتمد على النظام الموحد داخلياً
   - ✅ لا تخلق حالة منفصلة

---

## 🚨 أخطاء شائعة يجب تجنبها

### ❌ خطأ: استيراد من ملفات داخلية

```typescript
// ❌ خطأ
import { UnifiedAuthProvider } from '@/components/auth/UnifiedAuthProvider'
import { getAuthManager } from '@/lib/auth/unified-auth-manager'

// ✅ صحيح
import { UnifiedAuthProvider } from '@/contexts/auth-context'
```

### ❌ خطأ: استخدام authService في Server Components

```typescript
// ❌ خطأ
import { authService } from '@/lib/auth-service'
const user = await authService.getCurrentUser()

// ✅ صحيح
import { auth } from '@/auth'
const session = await auth()
```

### ❌ خطأ: استخدام auth في Client Components

```typescript
// ❌ خطأ
import { auth } from '@/auth' // server-only!

// ✅ صحيح
import { useUnifiedAuth } from '@/contexts/auth-context'
```

---

## 📚 أمثلة كاملة

### مثال 1: Client Component مع المصادقة

```typescript
'use client'

import { useUnifiedAuth } from '@/contexts/auth-context'

export default function ProfilePage() {
  const { user, isLoading, logout } = useUnifiedAuth()
  
  if (isLoading) return <div>جاري التحميل...</div>
  if (!user) return <div>غير مسجل دخول</div>
  
  return (
    <div>
      <h1>مرحباً {user.name}</h1>
      <button onClick={logout}>تسجيل الخروج</button>
    </div>
  )
}
```

### مثال 2: Server Component مع المصادقة

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div>
      <h1>لوحة التحكم</h1>
      <p>مرحباً {session.user.name}</p>
    </div>
  )
}
```

### مثال 3: API Route مع المصادقة

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  const result = await authService.verifyTokenFromRequest(request)
  
  if (!result.isValid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return NextResponse.json({
    user: result.user,
    sessionId: result.sessionId
  })
}
```

---

## 🔄 خطة الترقية من النظام القديم

إذا كان لديك كود قديم يستخدم `useAuth` أو `AuthProvider`:

### الخطوة 1: تأكد من وجود UnifiedAuthProvider

```typescript
// في app/layout.tsx أو providers/index.tsx
import { UnifiedAuthProvider } from '@/contexts/auth-context'

export default function RootLayout({ children }) {
  return (
    <UnifiedAuthProvider>
      {children}
    </UnifiedAuthProvider>
  )
}
```

### الخطوة 2: استبدل useAuth بـ useUnifiedAuth تدريجياً

```typescript
// ❌ القديم
import { useAuth } from '@/hooks/use-auth'
// أو
import { useAuth } from '@/components/auth/UserProvider'

// ✅ الجديد
import { useUnifiedAuth } from '@/contexts/auth-context'
```

### الخطوة 3: إزالة AuthProvider من Providers

```typescript
// ❌ القديم (تضارب - provider مزدوج)
<UnifiedAuthProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</UnifiedAuthProvider>

// ✅ الجديد (نظام واحد فقط)
<UnifiedAuthProvider>
  <App />
</UnifiedAuthProvider>
```

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل أو لديك أسئلة:

1. راجع هذا المستند أولاً
2. تحقق من التعليقات في الملفات
3. تأكد من استخدام نقاط التصدير الموحدة فقط

---

## ✅ الخلاصة

- ✅ **CLIENT-SIDE**: استخدم `@/contexts/auth-context` فقط (مصدر واحد موثوق)
  - ✅ `useUnifiedAuth()` - Hook الأساسي
  - ✅ `UnifiedAuthProvider` - Provider الموحد
  - ❌ لا يتم تصدير `useAuth` أو `AuthProvider` لتجنب التضارب
- ✅ **SERVER-SIDE**: استخدم `@/auth` للـ Server Components و `@/lib/auth-service` للـ API Routes
- ✅ **API CLIENT**: استخدم `@/lib/api/auth-client` لدوال API
- ⚠️ **التوافق**: إذا كنت تحتاج للتوافق مع الكود القديم:
  - استورد `useAuth` من `@/hooks/use-auth` (يستخدم `useUnifiedAuth` داخلياً)
  - استورد `AuthProvider` من `@/components/auth/UserProvider` (يتطلب `UnifiedAuthProvider` كـ parent)
  - لكن يُنصح بشدة بالترقية إلى `useUnifiedAuth` و `UnifiedAuthProvider`

**لا يوجد تضارب - النظام موحد بالكامل! 🎉**

