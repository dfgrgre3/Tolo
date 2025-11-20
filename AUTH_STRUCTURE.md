# 📚 البنية الموحدة لنظام المصادقة - دليل شامل

## ⭐ نظرة عامة

تم توحيد نظام المصادقة بالكامل لتجنب أي تضارب. يوجد الآن **نقطة تصدير موحدة واحدة** لكل جانب من جوانب النظام.

---

## 🎯 نقاط التصدير الموحدة

### 1. للعميل (Client-Side) ⭐

**المصدر الوحيد الموثوق: `@/contexts/auth-context.tsx`**

```typescript
// ✅ صحيح - استخدم هذا
import { useUnifiedAuth, UnifiedAuthProvider, useAuth } from '@/contexts/auth-context';

// ❌ خطأ - لا تستورد مباشرة من الملفات الداخلية
import { UnifiedAuthProvider } from '@/components/auth/UnifiedAuthProvider';
import { getAuthManager } from '@/lib/auth/unified-auth-manager';
import { useAuth } from '@/components/auth/UserProvider';
```

**ما يتم تصديره:**
- `useUnifiedAuth()` - Hook للمصادقة الموحدة (موصى به) ⭐
- `UnifiedAuthProvider` - Provider للمصادقة الموحدة
- `useAuth()` - Hook للتوافق مع الأنظمة القديمة
- `AuthProvider` - Provider للتوافق مع الأنظمة القديمة
- `User` - نوع بيانات المستخدم

---

### 2. للخادم (Server-Side) ⭐

**المصدر الوحيد الموثوق: `@/auth.ts`**

```typescript
// ✅ صحيح - استخدم هذا في Server Components
import { auth } from '@/auth';

// ❌ خطأ - لا تستورد مباشرة
import { authService } from '@/lib/auth-service'; // هذا للـ API Routes فقط
```

**ما يتم تصديره:**
- `auth()` - دالة للحصول على المستخدم الحالي من cookies

---

### 3. لـ API Routes ⭐

**المصدر الوحيد الموثوق: `@/lib/auth-service.ts`**

```typescript
// ✅ صحيح - استخدم هذا في API Routes
import { authService } from '@/lib/auth-service';

// ❌ خطأ - لا تستورد من @/auth
import { auth } from '@/auth'; // هذا للـ Server Components فقط
```

**ما يتم تصديره:**
- `authService` - خدمة المصادقة الكاملة
- `hashPassword()` - تشفير كلمة المرور
- `comparePasswords()` - مقارنة كلمة المرور

---

## 📁 البنية الكاملة

### CLIENT-SIDE (العميل)

```
src/contexts/auth-context.tsx ⭐
  └─> نقطة التصدير الموحدة (Single Source of Truth)
      └─> src/components/auth/UnifiedAuthProvider.tsx
          └─> src/lib/auth/unified-auth-manager.ts
              └─> إدارة الحالة والمزامنة
      
      └─> src/components/auth/UserProvider.tsx (طبقة توافق)
          └─> يعتمد على UnifiedAuthProvider داخلياً
```

**الاستخدام:**
```typescript
// ✅ في Client Components
import { useUnifiedAuth } from '@/contexts/auth-context'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useUnifiedAuth()
  // ...
}
```

---

### SERVER-SIDE (الخادم)

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

export default async function ServerComponent() {
  const session = await auth()
  if (!session) return <div>غير مسجل دخول</div>
  return <div>مرحباً {session.user.name}</div>
}
```

---

### API ROUTES

```
src/lib/auth-service.ts ⭐
  └─> الخدمة الأساسية للمصادقة
```

**الاستخدام:**
```typescript
// ✅ في API Routes
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

## 🔄 طبقات التوافق (Compatibility Layers)

هذه الملفات تعمل كطبقات توافق فقط للأنظمة القديمة:

1. **src/components/auth/UserProvider.tsx**
   - يعتمد على `UnifiedAuthProvider` داخلياً
   - يوفر واجهة متوافقة مع `useAuth` القديم
   - ⚠️ Deprecated - استخدم `useUnifiedAuth` بدلاً منه

2. **src/lib/auth/compatibility.ts**
   - يعتمد على `useUnifiedAuth` داخلياً
   - يوفر `useAuthCompatibility()` للتوافق
   - ⚠️ Deprecated - استخدم `useUnifiedAuth` مباشرة

3. **src/lib/auth-hook-enhanced.ts**
   - يعتمد على `useUnifiedAuth` داخلياً
   - يوفر `useEnhancedAuth()` للوظائف الإضافية (2FA، Social Login)
   - ✅ يمكن استخدامه للميزات المتقدمة

---

## 📖 دليل الاستخدام

### ✅ للاستخدام الأساسي (موصى به)

#### في Client Components:
```typescript
import { useUnifiedAuth } from '@/contexts/auth-context'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useUnifiedAuth()
  
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

#### في Server Components:
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

#### في API Routes:
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

### 🔄 للتوافق مع الكود القديم

إذا كان لديك كود قديم يستخدم `useAuth` أو `AuthProvider`:

```typescript
// ✅ الكود القديم سيعمل (لكن موصى بالترقية)
import { useAuth, AuthProvider } from '@/contexts/auth-context'

// ⚠️ يجب أن يكون UnifiedAuthProvider موجوداً كـ parent
<UnifiedAuthProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</UnifiedAuthProvider>
```

---

## 🚨 أخطاء شائعة يجب تجنبها

### ❌ خطأ: استيراد من ملفات داخلية

```typescript
// ❌ خطأ
import { UnifiedAuthProvider } from '@/components/auth/UnifiedAuthProvider'
import { getAuthManager } from '@/lib/auth/unified-auth-manager'
import { useAuth } from '@/components/auth/UserProvider'

// ✅ صحيح
import { UnifiedAuthProvider, useAuth } from '@/contexts/auth-context'
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

### ❌ خطأ: استخدام auth في API Routes

```typescript
// ❌ خطأ
import { auth } from '@/auth' // هذا للـ Server Components فقط

// ✅ صحيح
import { authService } from '@/lib/auth-service'
```

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

## 📦 Providers Hierarchy

### البنية الصحيحة:

```tsx
<UnifiedAuthProvider>          {/* المصدر الأساسي */}
  <AuthProvider>                {/* طبقة توافق */}
    <ClientLayoutProvider>
      <ToastProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </ToastProvider>
    </ClientLayoutProvider>
  </AuthProvider>
</UnifiedAuthProvider>
```

### الملفات المستخدمة:

1. **`src/providers/index.tsx`** (GlobalProviders) ✅
   - يستخدم في `src/app/layout.tsx`
   - البنية الصحيحة: UnifiedAuthProvider → AuthProvider

2. **`src/components/CombinedProviders.tsx`** ✅
   - للتوافق مع الأنظمة القديمة
   - البنية الصحيحة: UnifiedAuthProvider → AuthProvider

---

## ✅ الخلاصة

- ✅ **CLIENT-SIDE**: استخدم `@/contexts/auth-context` فقط
- ✅ **SERVER-SIDE**: استخدم `@/auth` للـ Server Components و `@/lib/auth-service` للـ API Routes
- ✅ **API CLIENT**: استخدم `@/lib/api/auth-client` لدوال API
- ✅ **التوافق**: طبقات التوافق تعمل تلقائياً إذا كان `UnifiedAuthProvider` موجوداً

**لا يوجد تضارب - النظام موحد بالكامل! 🎉**

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل أو لديك أسئلة:

1. راجع هذا المستند أولاً
2. تحقق من التعليقات في الملفات
3. تأكد من استخدام نقاط التصدير الموحدة فقط

