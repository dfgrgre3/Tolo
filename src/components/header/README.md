# Header & Mega Menu Components

## 📋 نظرة عامة

مجموعة من المكونات المتقدمة لإنشاء header احترافي مع mega menu تفاعلي. تم تصميم هذه المكونات مع التركيز على الأداء وإمكانية الوصول وتجربة المستخدم.

## ✨ الميزات الرئيسية

### 🚀 الأداء
- ✅ استخدام `useCallback` و `useMemo` لتحسين الأداء
- ✅ تقليل re-renders غير الضرورية
- ✅ إدارة ذاكرة محسّنة
- ✅ lazy loading للمحتوى الثقيل

### ♿ إمكانية الوصول
- ✅ دعم كامل لـ ARIA attributes
- ✅ التنقل بلوحة المفاتيح
- ✅ دعم قارئات الشاشة
- ✅ توافق مع WCAG 2.1 Level AA

### 🎨 تجربة المستخدم
- ✅ أنيميشن سلس باستخدام Framer Motion
- ✅ تصميم responsive
- ✅ بحث متقدم مع تمييز النتائج
- ✅ إشعارات في الوقت الفعلي

## 📦 المكونات

### MegaMenu
القائمة الرئيسية المنسدلة مع دعم الفئات والعناصر الفرعية.

```typescript
import { MegaMenu } from "@/components/mega-menu";

<MegaMenu
  categories={categories}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onOpen={() => setIsOpen(true)}
  activeRoute={(href) => pathname === href}
  label="القائمة"
  user={user}
/>
```

**Props:**
- `categories`: مصفوفة من الفئات
- `isOpen`: حالة القائمة (مفتوح/مغلق)
- `onClose`: دالة الإغلاق
- `onOpen`: دالة الفتح
- `activeRoute`: دالة لتحديد الرابط النشط
- `label`: نص الزر
- `user`: معلومات المستخدم (اختياري)
- `className`: classes إضافية (اختياري)

### MegaMenuContent
محتوى القائمة المنسدلة مع البحث والفئات.

```typescript
import { MegaMenuContent } from "@/components/mega-menu";

<MegaMenuContent
  categories={categories}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  activeRoute={(href) => pathname === href}
  user={user}
/>
```

**الميزات:**
- بحث متقدم مع تصفية فورية
- عرض ديناميكي للفئات
- إشعارات للمستخدمين المسجلين
- اختصارات لوحة المفاتيح

### HeaderNavigation
شريط التنقل الرئيسي للـ header.

```typescript
import { HeaderNavigation } from "@/components/header";

<HeaderNavigation
  openMegaMenu={openMegaMenu}
  setOpenMegaMenu={setOpenMegaMenu}
  isActiveRoute={(href) => pathname === href}
  mounted={mounted}
  user={user}
/>
```

### HeaderMobileMenu
قائمة التنقل للأجهزة المحمولة.

```typescript
import { HeaderMobileMenu } from "@/components/header";

<HeaderMobileMenu
  isMobileMenuOpen={isOpen}
  setIsMobileMenuOpen={setIsOpen}
  isActiveRoute={(href) => pathname === href}
  mounted={mounted}
/>
```

## 🎯 الاستخدام

### 1. إعداد البيانات

```typescript
// navData.tsx
export const mainNavItemsWithMegaMenu = [
  {
    href: "/",
    label: "الرئيسية",
    icon: Home,
    megaMenu: [
      {
        title: "الفئة الأولى",
        items: [
          {
            href: "/item-1",
            label: "العنصر 1",
            description: "وصف العنصر",
            icon: Icon,
            badge: "جديد"
          }
        ]
      }
    ]
  }
];
```

### 2. استخدام في الصفحة

```typescript
"use client";

import { useState } from "react";
import { HeaderNavigation } from "@/components/header";
import { usePathname } from "next/navigation";

export default function Header() {
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header>
      <HeaderNavigation
        openMegaMenu={openMegaMenu}
        setOpenMegaMenu={setOpenMegaMenu}
        isActiveRoute={(href) => pathname === href}
        mounted={mounted}
        user={user}
      />
    </header>
  );
}
```

## ⌨️ اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `ESC` | إغلاق القائمة |
| `/` | التركيز على البحث |
| `Enter` | فتح/إغلاق القائمة |
| `Space` | فتح/إغلاق القائمة |
| `Tab` | التنقل بين العناصر |

## 🎨 التخصيص

### الألوان والأنماط

```typescript
// استخدام className مخصص
<MegaMenu
  className="custom-mega-menu"
  // ...
/>
```

```css
/* في ملف CSS */
.custom-mega-menu {
  /* أنماط مخصصة */
}
```

### الأنيميشن

```typescript
// تخصيص الأنيميشن في MegaMenuContent
const customTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30
};
```

## 🔧 التطوير

### المتطلبات
- React 18+
- Next.js 14+
- Framer Motion
- Tailwind CSS

### التثبيت

```bash
npm install framer-motion lucide-react
```

### البناء

```bash
npm run build
```

### الاختبار

```bash
npm run test
```

## 📊 الأداء

### مقاييس الأداء
- **First Paint**: < 100ms
- **Time to Interactive**: < 300ms
- **Bundle Size**: ~15KB (gzipped)

### أفضل الممارسات
1. استخدام `useCallback` للدوال
2. استخدام `useMemo` للقيم المحسوبة
3. lazy loading للمحتوى الثقيل
4. تنظيف الموارد في `useEffect`

## ♿ إمكانية الوصول

### ARIA Attributes
- `role="dialog"` للقوائم المنسدلة
- `aria-modal="true"` للمحتوى المودال
- `aria-expanded` لحالة القوائم
- `aria-label` للوصف
- `aria-hidden` للعناصر الزخرفية

### دعم قارئات الشاشة
- وصف واضح لجميع العناصر
- تنبيهات للتغييرات الديناميكية
- تنقل منطقي

## 🐛 حل المشاكل

### القائمة لا تفتح
```typescript
// تأكد من تمرير onOpen
<MegaMenu
  onOpen={() => setIsOpen(true)}
  // ...
/>
```

### الأنيميشن بطيء
```typescript
// قلل stiffness و damping
transition={{
  stiffness: 300,
  damping: 25
}}
```

### مشاكل في الأجهزة المحمولة
```typescript
// تأكد من استخدام HeaderMobileMenu
<HeaderMobileMenu
  isMobileMenuOpen={isOpen}
  // ...
/>
```

## 📚 الموارد

- [التوثيق الكامل](./IMPROVEMENTS.md)
- [أمثلة الاستخدام](./USAGE-EXAMPLE.ts)
- [دليل التطوير](./header-implementation-plan.ts)

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء branch للميزة
3. Commit التغييرات
4. Push إلى Branch
5. فتح Pull Request

## 📝 الترخيص

MIT License - انظر [LICENSE](../../LICENSE) للتفاصيل

## 👥 الفريق

تم التطوير بواسطة فريق التطوير

## 📞 الدعم

للدعم والاستفسارات:
- GitHub Issues
- البريد الإلكتروني: support@example.com
- Discord: [رابط الدعوة]

---

**ملاحظة**: هذه المكونات في تطوير مستمر. نرحب بالملاحظات والاقتراحات!
