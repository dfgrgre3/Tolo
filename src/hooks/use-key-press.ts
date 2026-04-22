import { useState, useEffect, useCallback } from 'react';



/**
 * Hook لاكتشاف ضغط مفتاح معين
 * 
 * @param {string} targetKey - المفتاح المستهدف (مثل: 'Enter', 'Escape', 'a')
 * @param {Function} handler - الدالة المراد تنفيذها عند ضغط المفتاح
 * @param {Object} options - خيارات إضافية
 * 
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [query, setQuery] = useState('');
 * 
 *   useKeyPress('Enter', () => {
 *     logger.info('Searching for:', query);
 *   });
 * 
 *   return (
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *       placeholder="اضغط Enter للبحث"
 *     />
 *   );
 * }
 * ```
 */
export interface UseKeyPressOptions {
  /** تنفيذ فقط عند الضغط مع Ctrl */
  ctrlKey?: boolean;
  /** تنفيذ فقط عند الضغط مع Alt */
  altKey?: boolean;
  /** تنفيذ فقط عند الضغط مع Shift */
  shiftKey?: boolean;
  /** تنفيذ فقط عند الضغط مع Meta (Command في Mac) */
  metaKey?: boolean;
  /** منع السلوك الافتراضي */
  preventDefault?: boolean;
  /** تفعيل الاستماع */
  enabled?: boolean;
}

export function useKeyPress(
targetKey: string,
handler: (event: KeyboardEvent) => void,
options: UseKeyPressOptions = {})
: void {
  const {
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    metaKey = false,
    preventDefault = false,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // التحقق من المفتاح
      if (event.key !== targetKey) {
        return;
      }

      // التحقق من المفاتيح المساعدة
      if (ctrlKey && !event.ctrlKey) return;
      if (altKey && !event.altKey) return;
      if (shiftKey && !event.shiftKey) return;
      if (metaKey && !event.metaKey) return;

      // منع السلوك الافتراضي إذا لزم الأمر
      if (preventDefault) {
        event.preventDefault();
      }

      handler(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKey, handler, ctrlKey, altKey, shiftKey, metaKey, preventDefault, enabled]);
}

/**
 * Hook لاكتشاف ضغط عدة مفاتيح
 * 
 * @param {string[]} targetKeys - المفاتيح المستهدفة
 * @returns {Set<string>} مجموعة المفاتيح المضغوطة حالياً
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const pressedKeys = useMultiKeyPress(['Control', 'Shift', 's']);
 * 
 *   useEffect(() => {
 *     if (pressedKeys.has('Control') && pressedKeys.has('Shift') && pressedKeys.has('s')) {
 *       logger.info('Ctrl + Shift + S pressed!');
 *     }
 *   }, [pressedKeys]);
 * 
 *   return <div>اضغط Ctrl + Shift + S</div>;
 * }
 * ```
 */
export function useMultiKeyPress(targetKeys: string[]): Set<string> {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (targetKeys.includes(event.key)) {
        setPressedKeys((prev) => new Set(prev).add(event.key));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (targetKeys.includes(event.key)) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(event.key);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [targetKeys]);

  return pressedKeys;
}

/**
 * Hook لاكتشاف اختصارات لوحة المفاتيح
 * 
 * @param {Object} shortcuts - خريطة الاختصارات والدوال المرتبطة بها
 * 
 * @example
 * ```tsx
 * function Editor() {
 *   useKeyboardShortcuts({
 *     'ctrl+s': () => saveDocument(),
 *     'ctrl+z': () => undo(),
 *     'ctrl+y': () => redo(),
 *     'ctrl+shift+s': () => saveAs(),
 *   });
 * 
 *   return <div>المحرر</div>;
 * }
 * ```
 */
export function useKeyboardShortcuts(
shortcuts: Record<string, (event: KeyboardEvent) => void>)
: void {
  const parseShortcut = useCallback((shortcut: string) => {
    const parts = shortcut.toLowerCase().split('+');
    return {
      key: parts[parts.length - 1],
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd')
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parsed = parseShortcut(shortcut);

        if (
        event.key.toLowerCase() === parsed.key &&
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        event.metaKey === parsed.meta)
        {
          event.preventDefault();
          handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, parseShortcut]);
}