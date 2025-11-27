# Custom Hooks - دليل الاستخدام 🎣

مجموعة شاملة من الـ React Hooks القابلة لإعادة الاستخدام لتحسين تجربة التطوير والأداء.

---

## 📦 التثبيت والاستيراد

```tsx
// استيراد hook واحد
import { useLocalStorage } from '@/components/shared/hooks';

// استيراد عدة hooks
import { 
  useDebounce, 
  useMediaQuery, 
  useKeyPress 
} from '@/components/shared/hooks';
```

---

## 🗄️ Storage Hooks

### `useLocalStorage`

Hook للتخزين المحلي مع مزامنة تلقائية بين النوافذ.

**المميزات:**
- ✅ مزامنة تلقائية بين النوافذ
- ✅ دعم TypeScript كامل
- ✅ معالجة الأخطاء التلقائية
- ✅ دعم SSR (Server-Side Rendering)

**الاستخدام:**

```tsx
import { useLocalStorage } from '@/components/shared/hooks';

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      الوضع الحالي: {theme === 'light' ? 'فاتح' : 'داكن'}
    </button>
  );
}
```

**أمثلة متقدمة:**

```tsx
// تخزين كائن معقد
const [user, setUser] = useLocalStorage('user', {
  name: '',
  email: '',
  preferences: {
    notifications: true,
    theme: 'light'
  }
});

// تحديث باستخدام دالة
setUser(prev => ({
  ...prev,
  preferences: {
    ...prev.preferences,
    notifications: !prev.preferences.notifications
  }
}));
```

---

## ⚡ Performance Hooks

### `useDebounce`

Hook لتأخير تحديث القيمة - مفيد للبحث والتحقق من المدخلات.

**المميزات:**
- ✅ تحسين الأداء
- ✅ تقليل استدعاءات API
- ✅ قابل للتخصيص

**الاستخدام:**

```tsx
import { useDebounce } from '@/components/shared/hooks';
import { useState, useEffect } from 'react';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // البحث يتم فقط بعد توقف المستخدم عن الكتابة لمدة 500ms
      searchAPI(debouncedSearchTerm).then(results => {
        console.log('نتائج البحث:', results);
      });
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="ابحث..."
    />
  );
}
```

### `useDebouncedCallback`

Hook لتأخير تنفيذ دالة.

```tsx
import { useDebouncedCallback } from '@/components/shared/hooks';

function AutoSaveEditor() {
  const [content, setContent] = useState('');

  const handleSave = useDebouncedCallback((text: string) => {
    saveToServer(text);
    console.log('تم الحفظ تلقائياً');
  }, 1000);

  return (
    <textarea
      value={content}
      onChange={(e) => {
        setContent(e.target.value);
        handleSave(e.target.value);
      }}
    />
  );
}
```

---

## 📱 UI Hooks

### `useMediaQuery`

Hook للاستجابة لحجم الشاشة باستخدام CSS Media Queries.

**الاستخدام:**

```tsx
import { useMediaQuery } from '@/components/shared/hooks';

function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
      {isDarkMode && <p>الوضع الداكن مفعّل</p>}
    </div>
  );
}
```

### `useDeviceType`

Hook للحصول على نوع الجهاز الحالي.

```tsx
import { useDeviceType } from '@/components/shared/hooks';

function AdaptiveComponent() {
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useDeviceType();

  return (
    <div>
      {isMobile && <p>📱 هاتف محمول</p>}
      {isTablet && <p>📱 جهاز لوحي</p>}
      {isDesktop && <p>💻 حاسوب مكتبي</p>}
      {isTouchDevice && <p>👆 جهاز باللمس</p>}
    </div>
  );
}
```

### `useOrientation`

Hook للحصول على اتجاه الشاشة.

```tsx
import { useOrientation } from '@/components/shared/hooks';

function OrientationAware() {
  const orientation = useOrientation();

  return (
    <div>
      الشاشة في وضع: {orientation === 'portrait' ? 'عمودي 📱' : 'أفقي 📺'}
    </div>
  );
}
```

---

## 🖱️ Interaction Hooks

### `useOnClickOutside`

Hook لاكتشاف النقر خارج عنصر معين.

**الاستخدام:**

```tsx
import { useOnClickOutside } from '@/components/shared/hooks';
import { useRef, useState } from 'react';

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => {
    setIsOpen(false);
  });

  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>
        فتح القائمة
      </button>
      {isOpen && (
        <ul className="dropdown-menu">
          <li>خيار 1</li>
          <li>خيار 2</li>
          <li>خيار 3</li>
        </ul>
      )}
    </div>
  );
}
```

### `useOnClickOutsideMultiple`

Hook لاكتشاف النقر خارج عدة عناصر.

```tsx
import { useOnClickOutsideMultiple } from '@/components/shared/hooks';

function Modal() {
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useOnClickOutsideMultiple([modalRef, buttonRef], () => {
    closeModal();
  });

  return (
    <>
      <button ref={buttonRef}>فتح النافذة</button>
      <div ref={modalRef} className="modal">
        محتوى النافذة
      </div>
    </>
  );
}
```

---

## ⌨️ Keyboard Hooks

### `useKeyPress`

Hook لاكتشاف ضغط مفتاح معين.

**الاستخدام البسيط:**

```tsx
import { useKeyPress } from '@/components/shared/hooks';

function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  // فتح البحث بضغط "/"
  useKeyPress('/', () => {
    setIsOpen(true);
  }, { preventDefault: true });

  // إغلاق بضغط Escape
  useKeyPress('Escape', () => {
    setIsOpen(false);
  });

  return isOpen ? <SearchComponent /> : null;
}
```

**الاستخدام المتقدم مع مفاتيح مساعدة:**

```tsx
function Editor() {
  // حفظ بضغط Ctrl+S
  useKeyPress('s', () => {
    saveDocument();
  }, { 
    ctrlKey: true, 
    preventDefault: true 
  });

  // تراجع بضغط Ctrl+Z
  useKeyPress('z', () => {
    undo();
  }, { 
    ctrlKey: true 
  });

  // إعادة بضغط Ctrl+Shift+Z
  useKeyPress('z', () => {
    redo();
  }, { 
    ctrlKey: true,
    shiftKey: true 
  });

  return <div>المحرر</div>;
}
```

### `useMultiKeyPress`

Hook لاكتشاف ضغط عدة مفاتيح في نفس الوقت.

```tsx
import { useMultiKeyPress } from '@/components/shared/hooks';

function Component() {
  const pressedKeys = useMultiKeyPress(['Control', 'Shift', 's']);

  useEffect(() => {
    if (
      pressedKeys.has('Control') && 
      pressedKeys.has('Shift') && 
      pressedKeys.has('s')
    ) {
      console.log('Ctrl + Shift + S pressed!');
      saveAs();
    }
  }, [pressedKeys]);

  return <div>اضغط Ctrl + Shift + S للحفظ باسم</div>;
}
```

### `useKeyboardShortcuts`

Hook لتعريف اختصارات لوحة المفاتيح بشكل مركزي.

```tsx
import { useKeyboardShortcuts } from '@/components/shared/hooks';

function Editor() {
  useKeyboardShortcuts({
    'ctrl+s': () => saveDocument(),
    'ctrl+z': () => undo(),
    'ctrl+y': () => redo(),
    'ctrl+shift+s': () => saveAs(),
    'ctrl+b': () => toggleBold(),
    'ctrl+i': () => toggleItalic(),
    'ctrl+u': () => toggleUnderline(),
    'escape': () => closeModal(),
  });

  return <div>المحرر مع اختصارات لوحة المفاتيح</div>;
}
```

---

## 🎯 أمثلة عملية

### مثال 1: نموذج بحث متقدم

```tsx
import { 
  useDebounce, 
  useKeyPress, 
  useOnClickOutside 
} from '@/components/shared/hooks';

function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // البحث عند تغيير القيمة المؤخرة
  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery).then(setResults);
    }
  }, [debouncedQuery]);

  // فتح البحث بضغط "/"
  useKeyPress('/', () => {
    setIsOpen(true);
  }, { preventDefault: true });

  // إغلاق بضغط Escape
  useKeyPress('Escape', () => {
    setIsOpen(false);
  });

  // إغلاق عند النقر خارج البحث
  useOnClickOutside(searchRef, () => {
    setIsOpen(false);
  });

  return (
    <div ref={searchRef}>
      {isOpen && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث... (اضغط / للفتح، Esc للإغلاق)"
        />
      )}
      {results.length > 0 && (
        <ul>
          {results.map(result => (
            <li key={result.id}>{result.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### مثال 2: محرر نصوص مع حفظ تلقائي

```tsx
import { 
  useLocalStorage, 
  useDebouncedCallback, 
  useKeyboardShortcuts 
} from '@/components/shared/hooks';

function TextEditor() {
  const [content, setContent] = useLocalStorage('draft', '');
  const [saved, setSaved] = useState(true);

  const autoSave = useDebouncedCallback((text: string) => {
    saveToServer(text).then(() => {
      setSaved(true);
    });
  }, 2000);

  useKeyboardShortcuts({
    'ctrl+s': () => {
      saveToServer(content);
      setSaved(true);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaved(false);
    autoSave(newContent);
  };

  return (
    <div>
      <div className="status">
        {saved ? '✅ محفوظ' : '⏳ جارٍ الحفظ...'}
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="ابدأ الكتابة..."
      />
    </div>
  );
}
```

### مثال 3: واجهة متجاوبة

```tsx
import { useDeviceType, useOrientation } from '@/components/shared/hooks';

function ResponsiveLayout() {
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const orientation = useOrientation();

  return (
    <div className={`layout ${orientation}`}>
      {isMobile && <MobileNav />}
      {isTablet && <TabletNav />}
      {isDesktop && <DesktopNav />}
      
      <main>
        {isMobile && <MobileContent />}
        {(isTablet || isDesktop) && <DesktopContent />}
      </main>
    </div>
  );
}
```

---

## 🎨 أفضل الممارسات

### 1. استخدام useMemo مع الـ Hooks

```tsx
const searchResults = useMemo(() => {
  return items.filter(item => 
    item.name.includes(debouncedSearchTerm)
  );
}, [items, debouncedSearchTerm]);
```

### 2. تنظيف الموارد

جميع الـ hooks تقوم بالتنظيف التلقائي، لكن تأكد من:

```tsx
useEffect(() => {
  // استخدام الـ hook
  const cleanup = someHook();
  
  return () => {
    // التنظيف عند إلغاء التثبيت
    cleanup?.();
  };
}, []);
```

### 3. التعامل مع SSR

جميع الـ hooks تدعم SSR، لكن تأكد من:

```tsx
if (typeof window !== 'undefined') {
  // استخدام الـ hook
}
```

---

## 📚 موارد إضافية

- [React Hooks Documentation](https://react.dev/reference/react)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

**آخر تحديث:** 2025-11-27  
**الإصدار:** 1.0.0
