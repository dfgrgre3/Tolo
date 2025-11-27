# مكونات التطبيق (Components)

دليل شامل لجميع مكونات التطبيق مع أمثلة الاستخدام وأفضل الممارسات.

## 📁 البنية التنظيمية

```
src/components/
├── index.ts                      # تصدير مركزي لجميع المكونات
├── shared/                       # مكونات مشتركة
│   ├── LoadingSpinner.tsx
│   ├── Alert.tsx
│   └── index.ts
├── dashboard/                    # مكونات لوحة التحكم
│   ├── DashboardStatsCards.tsx
│   ├── SectionHeader.tsx
│   └── index.ts
├── analytics/                    # مكونات التحليلات
│   ├── DailyProgressChart.tsx
│   ├── StatusMessage.tsx
│   └── index.ts
├── auth/                         # مكونات المصادقة
├── ai/                          # مكونات الذكاء الاصطناعي
├── ui/                          # مكونات واجهة المستخدم الأساسية
└── ...
```

## 🎯 المبادئ الأساسية

### 1. **TypeScript First**
جميع المكونات مكتوبة بـ TypeScript مع types كاملة:

```tsx
interface MyComponentProps {
  /** وصف الخاصية */
  title: string;
  /** خاصية اختيارية */
  description?: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, description }) => {
  // ...
};
```

### 2. **React.memo للأداء**
استخدم `React.memo` للمكونات التي لا تتغير كثيراً:

```tsx
export const MyComponent = React.memo<MyComponentProps>(({ title }) => {
  // ...
});
```

### 3. **JSDoc للتوثيق**
كل مكون يجب أن يحتوي على JSDoc:

```tsx
/**
 * مكون عرض البطاقة
 * 
 * يعرض معلومات في بطاقة منسقة
 * 
 * @example
 * ```tsx
 * <Card title="العنوان" description="الوصف" />
 * ```
 */
export const Card: React.FC<CardProps> = ({ title, description }) => {
  // ...
};
```

### 4. **Accessibility**
جميع المكونات تدعم إمكانية الوصول:

```tsx
<button
  onClick={handleClick}
  aria-label="إغلاق النافذة"
  role="button"
  tabIndex={0}
>
  إغلاق
</button>
```

## 📦 المكونات المشتركة

### LoadingSpinner

مؤشر تحميل متحرك مع خيارات متعددة.

```tsx
import { LoadingSpinner } from '@/components/shared';

// استخدام بسيط
<LoadingSpinner />

// مع نص
<LoadingSpinner text="جارٍ التحميل..." />

// ملء الشاشة
<LoadingSpinner fullScreen size="lg" text="جارٍ المعالجة..." />
```

**الخصائص:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `text`: نص التحميل
- `fullScreen`: ملء الشاشة
- `color`: لون المؤشر

### SkeletonLoader

هيكل تحميل متحرك.

```tsx
import { SkeletonLoader } from '@/components/shared';

<SkeletonLoader lines={3} />
```

### Alert

تنبيهات ملونة مع أيقونات.

```tsx
import { Alert } from '@/components/shared';

<Alert 
  type="success"
  title="نجح!"
  message="تم حفظ التغييرات بنجاح"
  dismissible
  onDismiss={() => console.log('Dismissed')}
/>
```

**الأنواع:**
- `success`: نجاح (أخضر)
- `error`: خطأ (أحمر)
- `warning`: تحذير (أصفر)
- `info`: معلومات (أزرق)

## 📊 مكونات لوحة التحكم

### DashboardStatsCards

بطاقات إحصائيات لوحة التحكم.

```tsx
import { DashboardStatsCards } from '@/components/dashboard';

<DashboardStatsCards 
  stats={{
    totalTasks: 10,
    completedTasks: 7,
    todayTimeSpent: 120,
    weekTimeSpent: 600,
    upcomingEvents: 3,
    completionRate: 70
  }} 
/>
```

### SectionHeader

رأس قسم قابل لإعادة الاستخدام.

```tsx
import { SectionHeader } from '@/components/dashboard';

<SectionHeader 
  title="المهام"
  description="إدارة مهامك اليومية"
  showAddButton
  addButtonText="إضافة مهمة"
  onAdd={() => console.log('Add task')}
  showSearch
  searchPlaceholder="بحث في المهام..."
  onSearchChange={(value) => console.log(value)}
/>
```

## 📈 مكونات التحليلات

### DailyProgressChart

رسم بياني للتقدم اليومي.

```tsx
import { DailyProgressChart } from '@/components/analytics';

<DailyProgressChart 
  chartData={[
    { day: 'السبت', progress: 75 },
    { day: 'الأحد', progress: 85 },
    { day: 'الاثنين', progress: 90 }
  ]}
  mode="weekly"
  themeColors={{
    light: '#4f46e5',
    dark: '#818cf8'
  }}
/>
```

### StatusMessage

رسالة حالة مع أيقونة.

```tsx
import { StatusMessage } from '@/components/analytics';

<StatusMessage text="جارٍ التحميل..." />
<StatusMessage text="حدث خطأ" isError />
```

## 🎨 أفضل الممارسات

### 1. **استخدام التصدير المركزي**

```tsx
// ✅ جيد
import { Dashboard, Header, Footer } from '@/components';

// ❌ تجنب
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
```

### 2. **تسمية المكونات**

```tsx
// ✅ جيد - أسماء واضحة ووصفية
export const DashboardStatsCards = () => { /* ... */ };
export const UserProfileCard = () => { /* ... */ };

// ❌ تجنب - أسماء غامضة
export const Stats = () => { /* ... */ };
export const Card = () => { /* ... */ };
```

### 3. **Props Destructuring**

```tsx
// ✅ جيد
const MyComponent: React.FC<Props> = ({ title, description, onClose }) => {
  // ...
};

// ❌ تجنب
const MyComponent: React.FC<Props> = (props) => {
  return <div>{props.title}</div>;
};
```

### 4. **استخدام useMemo و useCallback**

```tsx
const MyComponent: React.FC<Props> = ({ items, onItemClick }) => {
  // ✅ جيد - تحسين الأداء
  const filteredItems = useMemo(
    () => items.filter(item => item.active),
    [items]
  );

  const handleClick = useCallback(
    (id: string) => {
      onItemClick(id);
    },
    [onItemClick]
  );

  return (
    <div>
      {filteredItems.map(item => (
        <button key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </button>
      ))}
    </div>
  );
};
```

### 5. **معالجة الأخطاء**

```tsx
const MyComponent: React.FC<Props> = ({ data }) => {
  // ✅ جيد - معالجة حالات الخطأ
  if (!data) {
    return <StatusMessage text="لا توجد بيانات" isError />;
  }

  if (data.length === 0) {
    return <EmptyState message="لا توجد عناصر" />;
  }

  return (
    <div>
      {data.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};
```

## 🧪 الاختبارات

كل مكون يجب أن يحتوي على ملف اختبار:

```tsx
// MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('يعرض العنوان بشكل صحيح', () => {
    render(<MyComponent title="اختبار" />);
    expect(screen.getByText('اختبار')).toBeInTheDocument();
  });

  it('يستدعي onClose عند النقر', () => {
    const onClose = jest.fn();
    render(<MyComponent onClose={onClose} />);
    
    screen.getByRole('button', { name: /إغلاق/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

## 📝 إضافة مكون جديد

### 1. إنشاء الملف

```tsx
// src/components/my-feature/MyNewComponent.tsx
import React from 'react';

export interface MyNewComponentProps {
  /** وصف الخاصية */
  title: string;
}

/**
 * مكون جديد
 * 
 * وصف المكون
 * 
 * @example
 * ```tsx
 * <MyNewComponent title="العنوان" />
 * ```
 */
export const MyNewComponent: React.FC<MyNewComponentProps> = React.memo(({ title }) => {
  return (
    <div>
      <h1>{title}</h1>
    </div>
  );
});

MyNewComponent.displayName = 'MyNewComponent';

export default MyNewComponent;
```

### 2. إضافة index.ts

```tsx
// src/components/my-feature/index.ts
export { MyNewComponent } from './MyNewComponent';
export type { MyNewComponentProps } from './MyNewComponent';
```

### 3. تحديث index.ts الرئيسي

```tsx
// src/components/index.ts
export { MyNewComponent } from './my-feature';
export type { MyNewComponentProps } from './my-feature';
```

## 🔄 التحديثات المستقبلية

- [ ] إضافة Storybook للتوثيق التفاعلي
- [ ] تحسين اختبارات المكونات
- [ ] إضافة مكونات متحركة أكثر
- [ ] تحسين دعم الوضع الداكن
- [ ] إضافة مكونات للنماذج المعقدة

## 📚 موارد إضافية

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Patterns](https://reactpatterns.com/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**آخر تحديث**: 2025-11-27
