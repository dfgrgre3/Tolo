import { useEffect, RefObject } from 'react';

/**
 * Hook لاكتشاف النقر خارج عنصر معين
 * 
 * مفيد لإغلاق القوائم المنسدلة والنوافذ المنبثقة
 * 
 * @param {RefObject<HTMLElement>} ref - مرجع العنصر
 * @param {Function} handler - الدالة المراد تنفيذها عند النقر خارج العنصر
 * @param {boolean} enabled - تفعيل أو تعطيل الاستماع (افتراضي: true)
 * 
 * @example
 * ```tsx
 * function Dropdown() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   const dropdownRef = useRef<HTMLDivElement>(null);
 * 
 *   useOnClickOutside(dropdownRef, () => {
 *     setIsOpen(false);
 *   });
 * 
 *   return (
 *     <div ref={dropdownRef}>
 *       <button onClick={() => setIsOpen(!isOpen)}>
 *         فتح القائمة
 *       </button>
 *       {isOpen && (
 *         <ul>
 *           <li>خيار 1</li>
 *           <li>خيار 2</li>
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;

      // عدم فعل شيء إذا كان النقر داخل العنصر
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // الاستماع لأحداث النقر واللمس
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

/**
 * Hook لاكتشاف النقر خارج عدة عناصر
 * 
 * @param {RefObject<HTMLElement>[]} refs - مصفوفة من مراجع العناصر
 * @param {Function} handler - الدالة المراد تنفيذها عند النقر خارج جميع العناصر
 * @param {boolean} enabled - تفعيل أو تعطيل الاستماع (افتراضي: true)
 * 
 * @example
 * ```tsx
 * function Modal() {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   const buttonRef = useRef<HTMLButtonElement>(null);
 * 
 *   useOnClickOutsideMultiple([modalRef, buttonRef], () => {
 *     closeModal();
 *   });
 * 
 *   return (
 *     <>
 *       <button ref={buttonRef}>فتح</button>
 *       <div ref={modalRef}>المحتوى</div>
 *     </>
 *   );
 * }
 * ```
 */
export function useOnClickOutsideMultiple<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T>[],
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      // التحقق من أن النقر ليس داخل أي من العناصر
      const isOutside = refs.every(ref => {
        const element = ref.current;
        return !element || !element.contains(event.target as Node);
      });

      if (isOutside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler, enabled]);
}
