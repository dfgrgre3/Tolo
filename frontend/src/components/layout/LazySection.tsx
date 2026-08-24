'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /**
   * How far outside the viewport (in px) the IntersectionObserver should
   * start watching. Positive = trigger before the element is visible.
   * Default: 300px (prefetch while still ~1 screen-height away).
   */
  rootMargin?: string;
  /** Fallback rendered while the section has not yet entered the viewport. */
  skeleton?: ReactNode;
  className?: string;
  /** aria-label forwarded to the wrapping <section> */
  'aria-label'?: string;
}

/**
 * LazySection — defer children rendering until the section scrolls near
 * the viewport. Place around any dashboard section that fires API requests
 * so that only above-the-fold sections fetch on mount.
 *
 * Once visible the section is permanently "unlocked"; it will never go back
 * to the skeleton, even if scrolled away, because `visible` is one-way.
 */
export function LazySection({
  children,
  rootMargin = '300px',
  skeleton,
  className,
  'aria-label': ariaLabel,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Already visible — nothing to observe
    if (!el || visible) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref} className={className} aria-label={ariaLabel}>
      {visible ? children : (skeleton ?? <DefaultSkeleton />)}
    </div>
  );
}

/** Minimal placeholder that preserves vertical space without layout shift. */
function DefaultSkeleton() {
  return (
    <div
      className="w-full min-h-[260px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse"
      aria-hidden="true"
    />
  );
}
