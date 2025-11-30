# 🚀 دليل البدء السريع - مكونات المصادقة

> ابدأ باستخدام مكونات المصادقة في دقائق!

---

## 📋 المحتويات

1. [التثبيت](#التثبيت)
2. [الاستخدام الأساسي](#الاستخدام-الأساسي)
3. [الأمثلة الشائعة](#الأمثلة-الشائعة)
4. [الخطوات التالية](#الخطوات-التالية)

---

## 📦 التثبيت

المكونات موجودة بالفعل في المشروع! لا حاجة لتثبيت إضافي.

```bash
# التأكد من تثبيت التبعيات
npm install
```

---

## 🎯 الاستخدام الأساسي

### 1. نموذج تسجيل الدخول

```tsx
import { EnhancedLoginForm } from '@/components/auth';

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <EnhancedLoginForm />
    </div>
  );
}

export default LoginPage;
```

### 2. حماية صفحة

```tsx
import { useUnifiedAuth } from '@/components/auth';
import { Navigate } from 'react-router-dom';

function ProtectedPage() {
  const { isAuthenticated, isLoading } = useUnifiedAuth();

  if (isLoading) {
    return <div>جارٍ التحميل...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <div>محتوى الصفحة المحمية</div>;
}
```

### 3. عرض معلومات المستخدم

```tsx
import { useUnifiedAuth } from '@/components/auth';

function UserProfile() {
  const { user, logout } = useUnifiedAuth();

  return (
    <div>
      <h1>مرحباً {user?.name}</h1>
      <p>البريد: {user?.email}</p>
      <button onClick={logout}>تسجيل الخروج</button>
    </div>
  );
}
```

---

## 💡 الأمثلة الشائعة

### مثال 1: التحقق من البريد الإلكتروني

```tsx
import { validateEmail } from '@/components/auth/utils';

function MyForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // التحقق الفوري
    const result = validateEmail(value);
    setError(result.isValid ? '' : result.error || '');
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={handleEmailChange}
      />
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
```

### مثال 2: معالجة الأخطاء

```tsx
import { handleLoginError } from '@/components/auth/utils';

async function login(credentials) {
  try {
    const response = await loginUser(credentials);
    // نجح تسجيل الدخول
  } catch (error) {
    // معالجة تلقائية مع عرض Toast
    const apiError = handleLoginError(error);
    setFormError(apiError.message);
  }
}
```

### مثال 3: استخدام Hook مخصص

```tsx
import { useLoginForm } from '@/components/auth/hooks';

function CustomLoginForm() {
  const {
    formData,
    handleSubmit,
    handleInputChange,
    isLoading,
    fieldErrors,
  } = useLoginForm();

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
      />
      {fieldErrors.email && <span>{fieldErrors.email}</span>}

      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
      />
      {fieldErrors.password && <span>{fieldErrors.password}</span>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'جارٍ...' : 'تسجيل الدخول'}
      </button>
    </form>
  );
}
```

---

## 🎨 مكونات جاهزة للاستخدام

### EmailField

```tsx
import { EmailField } from '@/components/auth/components';

<EmailField
  value={email}
  onChange={handleChange}
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
  error={emailError}
  isFocused={isFocused}
/>
```

### PasswordField

```tsx
import { PasswordField } from '@/components/auth/components';

<PasswordField
  value={password}
  onChange={handleChange}
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
  error={passwordError}
/>
```

### SubmitButton

```tsx
import { SubmitButton } from '@/components/auth/components';

<SubmitButton
  isLoading={isLoading}
  disabled={!isFormValid}
/>
```

---

## 🛠️ دوال مساعدة مفيدة

### التحقق من الصحة

```tsx
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
} from '@/components/auth/utils';

// التحقق من البريد الإلكتروني
const emailResult = validateEmail('user@example.com');

// التحقق من كلمة المرور
const passwordResult = validatePassword('MyP@ssw0rd');

// التحقق من النموذج كاملاً
const formResult = validateLoginForm({
  email: 'user@example.com',
  password: 'MyP@ssw0rd',
});
```

### معالجة الأخطاء

```tsx
import {
  handleError,
  isNetworkError,
  formatRetryTime,
} from '@/components/auth/utils';

try {
  await someAction();
} catch (error) {
  if (isNetworkError(error)) {
    toast.error('يرجى التحقق من اتصالك بالإنترنت');
  } else {
    handleError(error, {
      showToast: true,
      context: 'My Action',
    });
  }
}
```

---

## 📚 الخطوات التالية

### للمبتدئين
1. 📖 اقرأ [README.md](./README.md) للحصول على نظرة شاملة
2. 💡 جرّب الأمثلة أعلاه
3. 🎨 استكشف المكونات المتاحة

### للمطورين المتقدمين
1. 🔍 راجع [IMPROVEMENTS.md](./IMPROVEMENTS.md) للتحسينات التقنية
2. 🎣 استكشف الـ Hooks المخصصة في `hooks/`
3. 🛠️ راجع الأدوات المساعدة في `utils/`

### للمساهمين
1. 📝 راجع [CHANGELOG.md](./CHANGELOG.md) لسجل التغييرات
2. 🧪 أضف اختبارات للميزات الجديدة
3. 📚 حدّث الوثائق عند الحاجة

---

## 🆘 المساعدة والدعم

### الموارد
- 📖 [الدليل الشامل](./README.md)
- 📝 [وثائق التحسينات](./IMPROVEMENTS.md)
- 📋 [الملخص التنفيذي](./SUMMARY.md)
- 📜 [سجل التغييرات](./CHANGELOG.md)

### الأسئلة الشائعة

**س: كيف أستخدم التحقق بخطوتين؟**
```tsx
// سيتم عرض نموذج 2FA تلقائياً إذا كان مفعّلاً
<EnhancedLoginForm />
```

**س: كيف أخصص رسائل الخطأ؟**
```tsx
import { handleError } from '@/components/auth/utils';

handleError(error, {
  customMessage: 'رسالة مخصصة',
  showToast: true,
});
```

**س: كيف أتحقق من صحة كلمة المرور بمتطلبات مخصصة؟**
```tsx
import { validatePassword } from '@/components/auth/utils';

const result = validatePassword(password, {
  minLength: 12,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
});
```

---

## 🎉 نصائح سريعة

### ✅ افعل
- استخدم المكونات الجاهزة بدلاً من إنشاء مكونات جديدة
- استخدم دوال التحقق من `utils/validation.ts`
- استخدم معالجات الأخطاء من `utils/error-handler.ts`
- اتبع أفضل الممارسات في `README.md`

### ❌ لا تفعل
- لا تنشئ دوال تحقق مخصصة (استخدم الموجودة)
- لا تعالج الأخطاء يدوياً (استخدم المعالجات الموحدة)
- لا تتجاهل رسائل الخطأ
- لا تنسى ARIA labels للوصول

---

## 🚀 ابدأ الآن!

```tsx
// 1. استورد المكون
import { EnhancedLoginForm } from '@/components/auth';

// 2. استخدمه في صفحتك
function LoginPage() {
  return <EnhancedLoginForm />;
}

// 3. هذا كل شيء! 🎉
```

---

**تم التحديث:** 2025-11-30  
**الإصدار:** 2.0.0  
**الحالة:** ✅ جاهز للاستخدام
