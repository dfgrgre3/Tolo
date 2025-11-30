# 🔐 مكونات المصادقة (Auth Components)

> نظام مصادقة شامل ومحسّن مع دعم كامل للأمان وإمكانية الوصول

## 📋 جدول المحتويات

- [نظرة عامة](#نظرة-عامة)
- [الميزات](#الميزات)
- [البنية](#البنية)
- [الاستخدام](#الاستخدام)
- [المكونات](#المكونات)
- [الـ Hooks](#الـ-hooks)
- [الأدوات المساعدة](#الأدوات-المساعدة)
- [أفضل الممارسات](#أفضل-الممارسات)
- [الأمثلة](#الأمثلة)

---

## 🎯 نظرة عامة

مكونات المصادقة توفر نظام مصادقة كامل ومتكامل مع:

- ✅ تسجيل الدخول والتسجيل
- ✅ التحقق بخطوتين (2FA)
- ✅ المصادقة البيومترية (Passkeys/WebAuthn)
- ✅ إدارة الجلسات
- ✅ تحليل المخاطر
- ✅ تحديد المعدل (Rate Limiting)
- ✅ CAPTCHA
- ✅ إمكانية الوصول الكاملة (WCAG 2.1 AA)

---

## ✨ الميزات

### 🔒 الأمان

- **تشفير قوي**: جميع البيانات الحساسة مشفرة
- **تحليل المخاطر**: كشف تلقائي للأنشطة المشبوهة
- **تحديد المعدل**: حماية من هجمات القوة الغاشمة
- **CAPTCHA**: حماية إضافية بعد محاولات فاشلة
- **بصمة الجهاز**: تتبع الأجهزة المستخدمة

### ⚡ الأداء

- **Lazy Loading**: تحميل المكونات عند الحاجة فقط
- **Memoization**: تحسين إعادة الرسم باستخدام `useMemo` و `useCallback`
- **Code Splitting**: تقسيم الكود لتحميل أسرع
- **Optimistic Updates**: تحديثات فورية للواجهة

### ♿ إمكانية الوصول

- **ARIA Labels**: دعم كامل لقارئات الشاشة
- **Keyboard Navigation**: التنقل الكامل بلوحة المفاتيح
- **Focus Management**: إدارة محسّنة للتركيز
- **Error Announcements**: إعلانات الأخطاء للمستخدمين ذوي الاحتياجات الخاصة

### 🎨 تجربة المستخدم

- **رسائل واضحة**: رسائل خطأ ونجاح واضحة بالعربية
- **تحميل سلس**: مؤشرات تحميل وانتقالات سلسة
- **تحقق فوري**: تحقق من الصحة أثناء الكتابة
- **تصميم متجاوب**: يعمل على جميع الأجهزة

---

## 📁 البنية

```
src/components/auth/
├── 📄 index.ts                      # نقطة التصدير الرئيسية
├── 📄 IMPROVEMENTS.md               # وثائق التحسينات
├── 📄 README.md                     # هذا الملف
│
├── 📂 components/                   # مكونات UI قابلة لإعادة الاستخدام
│   ├── EmailField.tsx              # حقل البريد الإلكتروني
│   ├── PasswordField.tsx           # حقل كلمة المرور
│   ├── SubmitButton.tsx            # زر الإرسال
│   ├── TwoFactorForm.tsx           # نموذج التحقق بخطوتين
│   ├── ErrorBanner.tsx             # شريط الأخطاء
│   └── ...
│
├── 📂 hooks/                        # Custom Hooks
│   ├── useLoginForm.ts             # منطق نموذج تسجيل الدخول
│   ├── useRegisterForm.ts          # منطق نموذج التسجيل
│   ├── useAlternativeLogin.ts      # طرق تسجيل دخول بديلة
│   ├── useBiometricAuth.ts         # المصادقة البيومترية
│   └── ...
│
├── 📂 utils/                        # دوال مساعدة
│   ├── validation.ts               # دوال التحقق المحسّنة
│   ├── error-handler.ts            # معالج الأخطاء الموحد
│   ├── password-strength.ts        # تقييم قوة كلمة المرور
│   └── ...
│
├── 📂 types/                        # تعريفات الأنواع
│   ├── common.ts                   # أنواع مشتركة
│   ├── login-form.types.ts         # أنواع نموذج تسجيل الدخول
│   └── ...
│
├── 📂 login/                        # مكونات تسجيل الدخول
│   ├── LoginCredentialsStep.tsx
│   ├── LoginTwoFactorStep.tsx
│   ├── useLoginFlow.ts
│   └── ...
│
├── 📂 register/                     # مكونات التسجيل
│   ├── RegistrationAccountStep.tsx
│   ├── RegistrationSecurityStep.tsx
│   ├── useRegistrationFlow.ts
│   └── ...
│
├── 📂 security/                     # مكونات الأمان
│   ├── SmartRateLimiter.ts
│   ├── SecurityDashboard.tsx
│   └── ...
│
├── 📂 passkeys/                     # مكونات Passkeys
│   ├── PasskeyManager.ts
│   ├── PasskeyManagement.tsx
│   └── ...
│
└── 📂 sessions/                     # إدارة الجلسات
    ├── AdvancedSessionManager.ts
    ├── SessionManagementUI.tsx
    └── ...
```

---

## 🚀 الاستخدام

### تسجيل الدخول الأساسي

```tsx
import { EnhancedLoginForm } from '@/components/auth';

function LoginPage() {
  return (
    <div className="container">
      <EnhancedLoginForm />
    </div>
  );
}
```

### استخدام Hook مخصص

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
        {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
      </button>
    </form>
  );
}
```

### استخدام نظام المصادقة الموحد

```tsx
import { useUnifiedAuth } from '@/components/auth';

function UserProfile() {
  const { user, isAuthenticated, logout } = useUnifiedAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h1>مرحباً {user?.name}</h1>
      <p>البريد الإلكتروني: {user?.email}</p>
      <button onClick={logout}>تسجيل الخروج</button>
    </div>
  );
}
```

---

## 🧩 المكونات

### EmailField

حقل إدخال محسّن للبريد الإلكتروني مع دعم كامل لإمكانية الوصول.

```tsx
<EmailField
  value={email}
  onChange={handleChange}
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
  error={emailError}
  isFocused={isFocused}
  showSuccess={isValid}
  helperText="أدخل بريدك الإلكتروني"
/>
```

**الخصائص:**
- `value`: قيمة البريد الإلكتروني
- `onChange`: دالة التغيير
- `onFocus`: دالة التركيز
- `onBlur`: دالة فقدان التركيز
- `error`: رسالة الخطأ
- `isFocused`: حالة التركيز
- `showSuccess`: عرض حالة النجاح
- `helperText`: نص مساعد
- `disabled`: حالة التعطيل

### PasswordField

حقل إدخال محسّن لكلمة المرور مع مؤشر القوة.

```tsx
<PasswordField
  value={password}
  onChange={handleChange}
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
  error={passwordError}
  showStrength={true}
/>
```

### TwoFactorForm

نموذج التحقق بخطوتين.

```tsx
<TwoFactorForm
  twoFactorCode={code}
  onCodeChange={setCode}
  onSubmit={handleVerify}
  onBack={() => setShowTwoFactor(false)}
  isLoading={isLoading}
  errorMessage={error}
/>
```

---

## 🎣 الـ Hooks

### useLoginForm

Hook لإدارة حالة ومنطق نموذج تسجيل الدخول.

```tsx
const {
  formData,
  handleSubmit,
  handleInputChange,
  isLoading,
  showTwoFactor,
  fieldErrors,
  formErrorMessage,
  resetErrors,
} = useLoginForm();
```

**القيم المُرجعة:**
- `formData`: بيانات النموذج
- `handleSubmit`: دالة إرسال النموذج
- `handleInputChange`: دالة تغيير المدخلات
- `isLoading`: حالة التحميل
- `showTwoFactor`: عرض نموذج التحقق بخطوتين
- `fieldErrors`: أخطاء الحقول
- `formErrorMessage`: رسالة خطأ النموذج
- `resetErrors`: إعادة تعيين الأخطاء

### useRegisterForm

Hook لإدارة نموذج التسجيل.

```tsx
const {
  formData,
  handleSubmit,
  handleInputChange,
  isLoading,
  currentStep,
  fieldErrors,
  passwordStrength,
} = useRegisterForm();
```

### useAlternativeLogin

Hook لطرق تسجيل الدخول البديلة.

```tsx
const {
  handlePasskeyLogin,
  handleGoogleLogin,
  handleTestAccountLogin,
  isLoading,
} = useAlternativeLogin();
```

---

## 🛠️ الأدوات المساعدة

### validation.ts

دوال التحقق المحسّنة.

```tsx
import { validateEmail, validatePassword, validateLoginForm } from '@/components/auth/utils/validation';

// التحقق من البريد الإلكتروني
const emailResult = validateEmail('user@example.com');
if (!emailResult.isValid) {
  console.error(emailResult.error);
}

// التحقق من كلمة المرور
const passwordResult = validatePassword('MyP@ssw0rd', {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
});

// التحقق من نموذج تسجيل الدخول
const formResult = validateLoginForm({
  email: 'user@example.com',
  password: 'MyP@ssw0rd',
});
```

### error-handler.ts

معالج الأخطاء الموحد.

```tsx
import { handleError, handleLoginError, normalizeError } from '@/components/auth/utils/error-handler';

try {
  await loginUser(credentials);
} catch (error) {
  // معالجة تلقائية مع عرض Toast
  const apiError = handleLoginError(error);
  setFormError(apiError.message);
}

// أو معالجة مخصصة
try {
  await someAction();
} catch (error) {
  const apiError = handleError(error, {
    showToast: true,
    context: 'Custom Action',
    customMessage: 'رسالة مخصصة',
  });
}
```

### password-strength.ts

تقييم قوة كلمة المرور.

```tsx
import { calculatePasswordStrength } from '@/components/auth/utils/password-strength';

const strength = calculatePasswordStrength('MyP@ssw0rd');
// Returns: { score: 4, label: 'قوية', color: 'green' }
```

---

## 📚 أفضل الممارسات

### 1. استخدام التحقق من الصحة

```tsx
// ✅ جيد - استخدام دوال التحقق المحسّنة
import { validateEmail } from '@/components/auth/utils/validation';

const result = validateEmail(email);
if (!result.isValid) {
  setError(result.error);
}

// ❌ سيء - تحقق يدوي
if (!email.includes('@')) {
  setError('بريد غير صحيح');
}
```

### 2. معالجة الأخطاء

```tsx
// ✅ جيد - استخدام معالج الأخطاء الموحد
import { handleLoginError } from '@/components/auth/utils/error-handler';

try {
  await loginUser(credentials);
} catch (error) {
  const apiError = handleLoginError(error);
  setFormError(apiError.message);
}

// ❌ سيء - معالجة يدوية غير موحدة
try {
  await loginUser(credentials);
} catch (error) {
  toast.error('خطأ');
}
```

### 3. استخدام Hooks المخصصة

```tsx
// ✅ جيد - استخدام Hook مخصص
import { useLoginForm } from '@/components/auth/hooks';

function LoginForm() {
  const { formData, handleSubmit, isLoading } = useLoginForm();
  // ...
}

// ❌ سيء - إدارة الحالة يدوياً
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // ... منطق معقد
}
```

### 4. إمكانية الوصول

```tsx
// ✅ جيد - ARIA labels كاملة
<input
  type="email"
  aria-label="البريد الإلكتروني"
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>

// ❌ سيء - بدون ARIA labels
<input type="email" />
```

---

## 💡 الأمثلة

### مثال 1: نموذج تسجيل دخول مخصص

```tsx
import { useLoginForm } from '@/components/auth/hooks';
import { EmailField, PasswordField, SubmitButton } from '@/components/auth/components';

function CustomLoginForm() {
  const {
    formData,
    handleSubmit,
    handleInputChange,
    isLoading,
    fieldErrors,
    focusedField,
    setFocusedField,
  } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EmailField
        value={formData.email}
        onChange={handleInputChange}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField(null)}
        error={fieldErrors.email}
        isFocused={focusedField === 'email'}
      />

      <PasswordField
        value={formData.password}
        onChange={handleInputChange}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField(null)}
        error={fieldErrors.password}
        isFocused={focusedField === 'password'}
      />

      <SubmitButton isLoading={isLoading} />
    </form>
  );
}
```

### مثال 2: حماية صفحة

```tsx
import { useUnifiedAuth } from '@/components/auth';
import { Navigate } from 'react-router-dom';

function ProtectedPage() {
  const { isAuthenticated, isLoading, user } = useUnifiedAuth();

  if (isLoading) {
    return <div>جارٍ التحميل...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <h1>صفحة محمية</h1>
      <p>مرحباً {user?.name}</p>
    </div>
  );
}
```

### مثال 3: التحقق من الصحة المخصص

```tsx
import { validateEmail, validatePassword } from '@/components/auth/utils/validation';

function validateCustomForm(data: FormData) {
  const errors: Record<string, string> = {};

  // التحقق من البريد الإلكتروني
  const emailResult = validateEmail(data.email, {
    allowDisposable: false,
    maxLength: 100,
  });
  if (!emailResult.isValid && emailResult.error) {
    errors.email = emailResult.error;
  }

  // التحقق من كلمة المرور
  const passwordResult = validatePassword(data.password, {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  });
  if (!passwordResult.isValid && passwordResult.error) {
    errors.password = passwordResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

---

## 🔧 التكوين

### متغيرات البيئة

```env
# API
NEXT_PUBLIC_API_URL=https://api.example.com

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id

# CAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key

# Session
NEXT_PUBLIC_SESSION_TIMEOUT=3600000
```

---

## 🧪 الاختبار

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedLoginForm } from '@/components/auth';

describe('EnhancedLoginForm', () => {
  it('should render login form', () => {
    render(<EnhancedLoginForm />);
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
  });

  it('should show validation errors', async () => {
    render(<EnhancedLoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/البريد الإلكتروني مطلوب/i)).toBeInTheDocument();
    });
  });
});
```

---

## 📝 المساهمة

نرحب بالمساهمات! يرجى اتباع الإرشادات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى الفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.

---

## 🤝 الدعم

إذا كان لديك أي أسئلة أو مشاكل، يرجى:

1. فتح Issue على GitHub
2. التواصل عبر البريد الإلكتروني
3. مراجعة الوثائق

---

## 🎉 شكر خاص

- فريق Next.js
- فريق React
- مجتمع المطورين

---

**تم التحديث:** 2025-11-30
**الإصدار:** 2.0.0
