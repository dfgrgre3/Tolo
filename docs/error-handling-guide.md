# دليل نظام تصحيح الأخطاء المتقدم

هذا الدليل يشرح كيفية استخدام نظام تصحيح الأخطاء المتقدم والمركزي في تطبيق React.

## المكونات الرئيسية

### 1. ErrorManager (النظام المركزي)

خدمة مركزية تربط بين جميع مكونات معالجة الأخطاء وتوفر واجهة موحدة للتعامل مع الأخطاء.

#### الاستخدام الأساسي

```jsx
import errorManager from './services/ErrorManager';

// معالجة خطأ عام
const errorId = errorManager.handleError('حدث خطأ في التحميل');

// معالجة خطأ في الشبكة
const errorId = errorManager.handleNetworkError(
  'فشل في الاتصال بالخادم',
  '/api/users'
);

// معالجة خطأ في المصادقة
const errorId = errorManager.handleAuthError(
  'انتهت صلاحية الجلسة',
  {},
  {
    action: {
      label: 'تسجيل الدخول',
      onClick: () => window.location.href = '/login'
    }
  }
);
```

#### تخصيص سلوك الأخطاء

```jsx
import errorManager from './services/ErrorManager';

// إعدادات مخصصة للخطأ
const errorId = errorManager.handleError('خطأ مخصص', {
  showToast: true,      // عرض إشعار منبثق
  showBoundary: false,  // عدم عرض صفحة خطأ
  logError: true,       // تسجيل الخطأ
  severity: 'high'      // مستوى الخطورة
}, {
  title: 'خطأ في الحفظ',
  description: 'فشل في حفظ التغييرات',
  action: {
    label: 'إعادة المحاولة',
    onClick: () => retrySave()
  }
});
```

### 2. ErrorBoundary

مكون React محسن يلتقط الأخطاء ويتكامل مع النظام المركزي.

#### الاستخدام الأساسي

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* مكونات تطبيقك هنا */}
    </ErrorBoundary>
  );
}
```

#### استخدام صفحات الأخطاء المخصصة

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      showErrorPage={true}
      errorType="network"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {/* مكونات تطبيقك هنا */}
    </ErrorBoundary>
  );
}
```

#### معالجة الأخطاء المخصصة

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const handleError = (error, errorInfo) => {
    // معالجة إضافية للأخطاء
    console.log('Error caught:', error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      {/* مكونات تطبيقك هنا */}
    </ErrorBoundary>
  );
}
```

### 3. ErrorPages

مكونات لعرض صفحات أخطاء مخصصة لأنواع مختلفة من الأخطاء.

#### أنواع الأخطاء المدعومة

- `generic` - خطأ عام
- `network` - مشاكل في الشبكة
- `auth` - مشاكل في المصادقة
- `permission` - مشاكل في الصلاحيات
- `not-found` - صفحة غير موجودة
- `server` - أخطاء الخادم
- `validation` - أخطاء في التحقق من البيانات
- `timeout` - انتهاء مهلة الطلب

#### الاستخدام المباشر

```jsx
import ErrorPage from './components/ErrorPages';

function ErrorComponent() {
  return (
    <ErrorPage
      type="network"
      title="مشكلة في الاتصال"
      message="لا يمكن الاتصال بالخادم"
      errorId="err-12345"
      showDetails={true}
      onRetry={() => window.location.reload()}
    />
  );
}
```

### 2. ErrorLogger

خدمة متقدمة لتسجيل الأخطاء وتتبعها في جميع أنحاء التطبيق.

#### الاستخدام الأساسي

```jsx
import errorLogger from './services/ErrorLogger';

// تسجيل خطأ بسيط
errorLogger.logError('Something went wrong');

// تسجيل خطأ مع سياق إضافي
errorLogger.logError(new Error('API request failed'), {
  source: 'UserService',
  severity: 'high',
  endpoint: '/api/users',
  userId: '123'
});
```

#### تكوين ErrorLogger

```jsx
import errorLogger from './services/ErrorLogger';

// تكوين الخدمة
errorLogger.updateConfig({
  maxLogs: 200,
  enableConsoleLog: true,
  enableLocalStorage: true,
  enableRemoteLogging: true,
  remoteEndpoint: 'https://api.example.com/logs',
  apiKey: 'your-api-key'
});
```

#### الحصول على السجلات

```jsx
import errorLogger from './services/ErrorLogger';

// الحصول على جميع السجلات
const allLogs = errorLogger.getLogs();

// الحصول على السجلات غير المحلولة
const unresolvedLogs = errorLogger.getUnresolvedLogs();

// الحصول على السجلات حسب الخطورة
const highSeverityLogs = errorLogger.getLogsBySeverity('high');

// تصدير السجلات
const logsJson = errorLogger.exportLogs();
```

### 3. useErrorHandler Hook

خطاف React مخصص للتعامل مع الأخطاء في المكونات.

#### الاستخدام الأساسي

```jsx
import { useErrorHandler } from './hooks/useErrorHandler';

function MyComponent() {
  const { handleError, error, errorId, clearError } = useErrorHandler({
    context: { component: 'MyComponent' },
    severity: 'medium'
  });

  const handleClick = () => {
    try {
      // رمي خطأ
      throw new Error('Something went wrong');
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div>
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <p>Error ID: {errorId}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      <button onClick={handleClick}>Trigger Error</button>
    </div>
  );
}
```

#### استخدام useAsyncOperation

```jsx
import { useAsyncOperation } from './hooks/useErrorHandler';

function UserProfile({ userId }) {
  const { data, isLoading, error, execute } = useAsyncOperation(
    async (id) => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    { context: { component: 'UserProfile' }, severity: 'high' }
  );

  useEffect(() => {
    execute(userId);
  }, [userId, execute]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No user data</div>;

  return <div>{data.name}</div>;
}
```

### 4. ErrorDashboard

لوحة تحكم متقدمة لعرض وإدارة الأخطاء.

#### الاستخدام

```jsx
import ErrorDashboard from './components/ErrorDashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      <button onClick={() => setShowDashboard(true)}>
        Show Error Dashboard
      </button>

      {showDashboard && (
        <ErrorDashboard onClose={() => setShowDashboard(false)} />
      )}

      {/* باقي تطبيقك */}
    </div>
  );
}
```

### 5. ErrorToast & ToastProvider

مكونات لعرض إشعارات الأخطاء المنبثقة.

#### إعداد المزود

```jsx
import { ToastProvider } from './components/ErrorToastContainer';

function App() {
  return (
    <ToastProvider>
      {/* باقي تطبيقك */}
    </ToastProvider>
  );
}
```

#### عرض إشعارات الأخطاء

```jsx
import { useToast } from './components/ErrorToastContainer';

function MyComponent() {
  const { showToast } = useToast();

  const handleClick = () => {
    showToast({
      title: 'حدث خطأ',
      description: 'فشل حفظ التغييرات',
      variant: 'destructive',
      action: {
        label: 'إعادة المحاولة',
        onClick: () => console.log('Retry action')
      }
    });
  };

  return <button onClick={handleClick}>Show Error Toast</button>;
}
```

## أفضل الممارسات

1. **استخدم ErrorBoundary على مستوى عالٍ**: قم بتغليف التطبيق بأكمله في ErrorBoundary للتعامل مع الأخطاء غير المتوقعة.

2. **سجّل الأخطاء بسياق كافٍ**: عند تسجيل الأخطاء، قم بتوفير سياق كافٍ لتسهيل تصحيحها.

3. **استخدم الخطافات المناسبة**: استخدم `useErrorHandler` للتعامل مع الأخطاء في المكونات، و `useAsyncOperation` للعمليات غير المتزامنة.

4. **قدم ملاحظات واضحة للمستخدمين**: استخدم ErrorToast لإعلام المستخدمين بالمشاكل بطريقة غير مزعجة.

5. **راقب الأخطاء بانتظام**: استخدم ErrorDashboard لمراقبة الأخطاء وتحليلها بانتظام.

6. **حدد أولويات الأخطاء**: استخدم مستويات الخطورة (low, medium, high, critical) لتحديد أولويات معالجة الأخطاء.

## التكامل مع خدمات الطرف الثالث

يمكنك تكوين ErrorLogger للعمل مع خدمات تتبع الأخطاء مثل Sentry أو LogRocket:

```jsx
import errorLogger from './services/ErrorLogger';

// التكامل مع Sentry
errorLogger.updateConfig({
  enableRemoteLogging: true,
  remoteEndpoint: 'https://sentry.io/api/123456/store/',
  apiKey: 'your-sentry-api-key'
});
```

## خاتمة

نظام تصحيح الأخطاء هذا يوفر حلاً شاملاً لتتبع وإدارة الأخطاء في تطبيق React. من خلال استخدام هذه المكونات والخدمات بشكل صحيح، يمكنك تحسين تجربة المستخدم وتسهيل عملية تصحيح الأخطاء للمطورين.
