# 🏠 Thanawy Homepage - Guest Experience

**منصة تعليمية احترافية - تجربة الزائر**

---

## 📋 نظرة عامة

هذا المجلد يحتوي على جميع مكونات الصفحة الرئيسية للمستخدمين غير المسجلين (Guests) في منصة Thanawy التعليمية.

### الهدف
عرض منصة تعليمية عصرية واحترافية مستوحاة من أفضل الممارسات في UX (مثل Noon) لكن بهوية تعليمية أصيلة.

### الميزات الرئيسية
- ✨ Design system موحد وشامل
- 📱 Responsive design (360px - 4K)
- 🌙 Dark mode support
- ⚡ Performance optimized
- ♿ Accessible (WCAG AA)
- 🎯 Data-driven sections

---

## 📂 بنية المجلد

```
guest/
├── GuestHome.tsx              # المكون الرئيسي
├── design-system.ts           # نظام التصميم الموحد ⭐
├── types.ts                   # TypeScript interfaces
├── api.ts                      # API endpoints
├── helpers.ts                  # Utility functions
├── constants.ts               # ثوابت القسم
│
├── hooks/
│   └── useGuestHomeData.ts    # Hook رئيسي لجلب البيانات
│
├── sections/                  # الأقسام المختلفة
│   ├── HeroSection.tsx
│   ├── WhyUsSection.tsx
│   ├── CategoriesSection.tsx
│   ├── FeaturedCoursesSection.tsx    # ✨ جديد
│   ├── CoursesSection.tsx
│   ├── NewCoursesSection.tsx         # ✨ جديد
│   ├── BestTeachersSection.tsx       # ✨ جديد
│   ├── ExamPreparationSection.tsx    # ✨ جديد
│   ├── HowItWorksSection.tsx
│   ├── InstructorsSection.tsx
│   ├── PromotionalCTASection.tsx     # ✨ جديد
│   ├── PlatformStatsSection.tsx      # ✨ جديد
│   ├── StatsStrip.tsx
│   ├── BlogSection.tsx
│   ├── InstructorCtaSection.tsx
│   └── NewsletterSection.tsx
│
└── README.md                  # هذا الملف
```

---

## 🎨 نظام التصميم

### استخدام Design System

**ممنوع**: استخدام ألوان أو أبعاد hardcoded

```typescript
// ❌ خطأ
<div className="p-[18px] text-[#0F766E]">...</div>

// ✅ صحيح
import { SPACING, COLORS, TYPOGRAPHY } from './design-system';
<div className={`p-${SPACING.lg} text-[${COLORS.primary}]`}>...</div>
```

### الألوان الموحدة

```typescript
import { COLORS } from './design-system';

COLORS.primary      // #0F766E (Brand Teal)
COLORS.accent       // #F59E0B (Brand Orange)
COLORS.text         // #1E293B (Dark Text)
COLORS.textSecondary // #64748B (Gray)
COLORS.bg           // #F8FAFC (Light BG)
COLORS.border       // #E2E8F0 (Light Border)
```

### مقياس المسافات

```typescript
import { SPACING } from './design-system';

SPACING.xs   // 4px
SPACING.sm   // 8px
SPACING.md   // 12px
SPACING.base // 16px
SPACING.lg   // 24px
SPACING.xl   // 32px
SPACING['2xl'] // 40px
// إلخ...
```

### Grid Systems

```typescript
import { GRIDS } from './design-system';

GRIDS.categories  // 2 sm:3 md:4 lg:6 gap-4
GRIDS.courses     // 1 sm:2 md:3 lg:4 gap-6
GRIDS.instructors // 2 sm:3 md:4 gap-4
GRIDS.stats       // 1 sm:2 lg:4 gap-6
```

---

## 🏗️ إنشاء قسم جديد

### خطوات الإنشاء

#### 1. إنشاء المكون

```typescript
// sections/MyNewSection.tsx
'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CONTAINER, GRIDS, TYPOGRAPHY, SECTION_HEADER } from '../design-system';
import type { CourseItem } from '../types';

interface MyNewSectionProps {
  items: CourseItem[];
  loading: boolean;
}

export function MyNewSection({ items, loading }: MyNewSectionProps) {
  return (
    <section className="py-16 bg-white border-b border-[#E2E8F0]">
      <div className={CONTAINER.className}>
        {/* Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              عنوان القسم
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              وصف فرعي
            </p>
          </div>
          <Link
            href="/courses"
            className={SECTION_HEADER.viewAllButton}
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className={GRIDS.courses}>
            {/* Skeleton loaders */}
          </div>
        ) : (
          <div className={GRIDS.courses}>
            {/* Content */}
          </div>
        )}
      </div>
    </section>
  );
}
```

#### 2. إضافة المكون في GuestHome

```typescript
// GuestHome.tsx
import { MyNewSection } from './sections/MyNewSection';

export default function GuestHome() {
  return (
    <div className="min-h-screen">
      {/* ... other sections ... */}
      <MyNewSection items={items} loading={loading} />
      {/* ... other sections ... */}
    </div>
  );
}
```

#### 3. إضافة Hook للبيانات (اختياري)

```typescript
// hooks/useMyNewSection.ts
import { useEffect, useState } from 'react';
import { fetchMyData } from '../api';
import type { Item } from '../types';

export function useMyNewSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchMyData().then((data) => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { items, loading };
}
```

---

## 🔌 API Integration

### جلب البيانات

```typescript
// api.ts
export async function fetchMyData(): Promise<Item[]> {
  const { data, error } = await safeFetch<ApiResponse>(
    '/api/my-endpoint?limit=10',
    undefined,
    null
  );

  if (error || !data) return [];
  return data.items || data.data || [];
}
```

### معالجة الأخطاء

```typescript
// ✅ صحيح: إرجاع مصفوفة فارغة عند الخطأ
if (error || !data) return [];

// ❌ خطأ: عدم التعامل مع الخطأ
return data.items; // قد يكون undefined
```

---

## 📦 Card Components

### استخدام CourseCard

```typescript
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';

// Skeleton (loading state)
<CourseCardSkeleton />

// Card الفعلي
<CourseCard
  id={course.id}
  title={course.title}
  slug={course.slug}
  thumbnail={course.thumbnail}
  categoryName={category}
  instructorName={instructor}
  ratingAvg={course.rating}
  reviewsCount={course.reviews}
  studentsCount={course.students}
  price={course.price}
  discountPrice={course.discount}
  level={course.level}
/>
```

### أبعاد الـ Cards الموحدة

```typescript
// يجب أن تكون جميع الـ cards في نفس القسم بنفس الارتفاع
CARD_DIMENSIONS.course = {
  width: 'w-full',
  height: 'auto',
  aspectRatio: 'aspect-video', // 16:9
  imageHeight: 'h-40',
  titleLines: 2,
  titleClamp: 'line-clamp-2',
  borderRadius: 'rounded-[12px]',
  padding: 'p-4',
};
```

---

## 🎯 معايير الجودة

### ✅ يجب القيام به

- [ ] استخدام `design-system.ts` للألوان والأبعاد
- [ ] توحيد أبعاد جميع الـ cards في القسم
- [ ] إضافة skeleton loading states
- [ ] إضافة empty states
- [ ] إضافة error handling
- [ ] اختبار responsive design
- [ ] اختبار dark mode
- [ ] إضافة ARIA labels
- [ ] توثيق Props
- [ ] لا استخدام `any` types

### ❌ ممنوع

- [ ] Hardcoded colors
- [ ] Random spacing values
- [ ] Missing accessibility
- [ ] No loading states
- [ ] Broken images
- [ ] Console errors
- [ ] TypeScript errors
- [ ] Copy/paste code
- [ ] Component duplication

---

## 🧪 الاختبار

### اختبار Responsive

```bash
# جميع الـbreakpoints
- 360px (Mobile)
- 640px (Tablet)
- 1024px (Laptop)
- 1920px (4K)
```

### اختبار Dark Mode

```bash
# في DevTools
- Toggle between light/dark
- Check colors are readable
- Check contrast >= 4.5:1
```

### اختبار Accessibility

```bash
# استخدم axe DevTools
- Check color contrast
- Check ARIA labels
- Check keyboard navigation
- Check heading hierarchy
```

---

## 📚 أمثلة حقيقية

### مثال 1: بسيط (Categories)

```typescript
// CategoriesSection.tsx
export function CategoriesSection({ categories, loading }) {
  return (
    <section className="py-16">
      <div className={CONTAINER.className}>
        <h2 className={TYPOGRAPHY.sectionHeading}>
          تصفح الكورسات حسب المجال
        </h2>

        {loading ? (
          <div className={GRIDS.categories}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded" />
            ))}
          </div>
        ) : (
          <div className={GRIDS.categories}>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/courses?category=${cat.id}`}>
                <div className="...">
                  {/* Category content */}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

### مثال 2: متقدم (Courses مع Tabs)

```typescript
// CoursesSection.tsx
export function CoursesSection({
  courses,
  loading,
  selectedTab,
  onTabChange,
}) {
  return (
    <section className="py-16 bg-white">
      <div className={CONTAINER.className}>
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={selectedTab === key ? 'active' : 'inactive'}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className={GRIDS.courses}>
          {loading ? (
            [...Array(4)].map((_, i) => <CourseCardSkeleton key={i} />)
          ) : (
            courses.map((c) => <CourseCard key={c.id} {...c} />)
          )}
        </div>
      </div>
    </section>
  );
}
```

---

## 🚀 Performance Tips

### Lazy Loading
```typescript
// استخدم dynamic imports للمكونات الثقيلة
const HeavySection = dynamic(() =>
  import('./sections/HeavySection').then(m => ({ default: m.HeavySection })),
  { loading: () => <Skeleton /> }
);
```

### Image Optimization
```typescript
// استخدم Next.js Image دائماً
import Image from 'next/image';

<Image
  src={thumbnail}
  alt={title}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
  className="object-cover"
/>
```

### Memoization
```typescript
// Memoize heavy computations
const memoizedData = useMemo(() => processData(items), [items]);
```

---

## 🐛 Debugging

### Console Errors
```bash
# تحقق من
- Network errors
- API 404s
- TypeScript errors
- Missing imports
```

### Layout Issues
```bash
# استخدم DevTools
- Check element dimensions
- Check spacing/padding
- Check alignment
- Check overflow
```

### Performance
```bash
# استخدم Lighthouse
- Performance score
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)
```

---

## 📖 الموارد الإضافية

### Documentation
- `design-system.ts` - Design tokens
- `types.ts` - TypeScript interfaces
- `api.ts` - API endpoints
- `/` (Tailwind) - Styling utilities

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [TypeScript](https://www.typescriptlang.org)

---

## ✍️ التوثيق

**آخر تحديث**: 25 أغسطس 2026
**النسخة**: 2.0 (Redesigned)
**الحالة**: 🟢 Production Ready

---

## 📞 للمزيد من المساعدة

- تحقق من `design-system.ts` للألوان والأبعاد
- تحقق من الأقسام الموجودة للأمثلة
- قراءة TypeScript errors بعناية
- اختبر في جميع الـbreakpoints

**Happy Coding! 🚀**
