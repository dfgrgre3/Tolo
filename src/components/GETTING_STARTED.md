# 🚀 دليل البدء السريع

دليل سريع لاستخدام المكونات المحسّنة في مشروعك.

## 📦 التثبيت

لا حاجة لتثبيت إضافي! جميع المكونات جاهزة للاستخدام.

## 🎯 الاستخدام الأساسي

### 1. استيراد المكونات

```tsx
// استيراد من التصدير المركزي
import { 
  Dashboard, 
  Header, 
  Footer,
  LoadingSpinner,
  Alert,
  DashboardStatsCards
} from '@/components';

// أو استيراد محدد
import { DailyProgressChart } from '@/components/analytics';
import { SectionHeader } from '@/components/dashboard';
```

### 2. استخدام المكونات المشتركة

#### مؤشر التحميل
```tsx
import { LoadingSpinner } from '@/components';

function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner size="lg" text="جارٍ التحميل..." />;
  }

  return <div>المحتوى</div>;
}
```

#### التنبيهات
```tsx
import { Alert } from '@/components';

function MyComponent() {
  return (
    <Alert 
      type="success"
      title="تم بنجاح!"
      message="تم حفظ التغييرات بنجاح"
      dismissible
      onDismiss={() => console.log('تم الإغلاق')}
    />
  );
}
```

### 3. استخدام مكونات لوحة التحكم

#### بطاقات الإحصائيات
```tsx
import { DashboardStatsCards } from '@/components';

function Dashboard() {
  const stats = {
    totalTasks: 10,
    completedTasks: 7,
    todayTimeSpent: 120,
    weekTimeSpent: 600,
    upcomingEvents: 3,
    completionRate: 70
  };

  return <DashboardStatsCards stats={stats} />;
}
```

#### رأس القسم
```tsx
import { SectionHeader } from '@/components';

function TasksPage() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div>
      <SectionHeader 
        title="المهام"
        description="إدارة مهامك اليومية"
        showAddButton
        addButtonText="إضافة مهمة"
        onAdd={() => console.log('إضافة مهمة')}
        showSearch
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      {/* محتوى الصفحة */}
    </div>
  );
}
```

### 4. استخدام مكونات التحليلات

#### رسم بياني
```tsx
import { DailyProgressChart } from '@/components';

function AnalyticsPage() {
  const chartData = [
    { day: 'السبت', progress: 75, details: 'جيد' },
    { day: 'الأحد', progress: 85, details: 'ممتاز' },
    { day: 'الاثنين', progress: 90, details: 'رائع' }
  ];

  return (
    <DailyProgressChart 
      chartData={chartData}
      mode="weekly"
    />
  );
}
```

## 🎨 التخصيص

### تخصيص الألوان

```tsx
import { DailyProgressChart } from '@/components';

<DailyProgressChart 
  chartData={data}
  themeColors={{
    light: '#4f46e5',  // اللون الأساسي
    dark: '#818cf8'    // اللون الداكن
  }}
/>
```

### تخصيص الحجم

```tsx
import { LoadingSpinner } from '@/components';

<LoadingSpinner size="sm" />   // صغير
<LoadingSpinner size="md" />   // متوسط (افتراضي)
<LoadingSpinner size="lg" />   // كبير
<LoadingSpinner size="xl" />   // كبير جداً
```

## 🔧 أمثلة متقدمة

### استخدام مع React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner, Alert } from '@/components';

function DataComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData
  });

  if (isLoading) {
    return <LoadingSpinner text="جارٍ تحميل البيانات..." />;
  }

  if (error) {
    return (
      <Alert 
        type="error"
        title="خطأ"
        message={error.message}
      />
    );
  }

  return <div>{/* عرض البيانات */}</div>;
}
```

### استخدام مع Form

```tsx
import { useState } from 'react';
import { SectionHeader, Alert, LoadingSpinner } from '@/components';

function FormPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await saveData();
      setSuccess(true);
    } catch (error) {
      // معالجة الخطأ
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionHeader 
        title="النموذج"
        showAddButton
        addButtonText="حفظ"
        onAdd={handleSubmit}
      />

      {success && (
        <Alert 
          type="success"
          message="تم الحفظ بنجاح"
          dismissible
          onDismiss={() => setSuccess(false)}
        />
      )}

      {loading && <LoadingSpinner />}

      {/* محتوى النموذج */}
    </div>
  );
}
```

## 📚 الموارد

- **[README.md](./README.md)** - دليل شامل
- **[FINAL_REPORT.md](./FINAL_REPORT.md)** - تقرير التحسينات
- **[components.config.json](./components.config.json)** - ملف التكوين

## 💡 نصائح

### 1. استخدم TypeScript
جميع المكونات مكتوبة بـ TypeScript، استفد من IntelliSense:

```tsx
// TypeScript سيقترح جميع الخصائص المتاحة
<Alert type="..." />
//         ^ اضغط Ctrl+Space لرؤية الخيارات
```

### 2. استخدم React.memo
المكونات تستخدم `React.memo` بالفعل، لكن تأكد من تمرير props ثابتة:

```tsx
// ✅ جيد
const handleClick = useCallback(() => {
  // ...
}, []);

<MyComponent onClick={handleClick} />

// ❌ تجنب
<MyComponent onClick={() => {}} />
```

### 3. استخدم التصدير المركزي
دائماً استورد من `@/components` للحصول على أفضل تجربة:

```tsx
// ✅ جيد
import { Alert, LoadingSpinner } from '@/components';

// ❌ تجنب
import Alert from '@/components/shared/Alert';
```

## 🐛 استكشاف الأخطاء

### المكون لا يظهر
تأكد من استيراد المكون بشكل صحيح:

```tsx
// تحقق من الاستيراد
import { ComponentName } from '@/components';

// تحقق من الاستخدام
<ComponentName />
```

### خطأ في Types
تأكد من تمرير جميع الخصائص المطلوبة:

```tsx
// تحقق من التعريف
interface Props {
  title: string;      // مطلوب
  description?: string; // اختياري
}
```

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع [README.md](./README.md)
2. تحقق من [CHANGELOG.md](./CHANGELOG.md)
3. راجع أمثلة الكود في الملفات

---

**صُنع بـ ❤️ للمطورين**
