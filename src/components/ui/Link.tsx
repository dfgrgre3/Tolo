import React from 'react';
import NextLink from 'next/link';

/**
 * مكون رابط محسّن
 * 
 * غلاف حول Next.js Link مع دعم TypeScript الكامل
 * 
 * @component
 * @example
 * ```tsx
 * <Link href="/dashboard">
 *   الذهاب إلى لوحة التحكم
 * </Link>
 * ```
 */

export interface LinkProps {
  /** محتوى الرابط */
  children: React.ReactNode;
  /** عنوان URL للرابط */
  href: string | { pathname: string; query?: Record<string, string> };
  /** فئات CSS إضافية */
  className?: string;
  /** معالج حدث النقر */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** فتح في نافذة جديدة */
  target?: '_blank' | '_self' | '_parent' | '_top';
  /** علاقة الرابط */
  rel?: string;
  /** تسمية ARIA للوصول */
  'aria-label'?: string;
  /** معرف فريد */
  id?: string;
  /** دور ARIA */
  role?: string;
}

/**
 * مكون Link
 */
const Link = React.memo<LinkProps>(({ 
  children, 
  href, 
  className = '', 
  onClick,
  target,
  rel,
  ...props 
}) => {
  // إضافة rel="noopener noreferrer" تلقائياً للروابط الخارجية
  const linkRel = target === '_blank' && !rel ? 'noopener noreferrer' : rel;

  return (
    <NextLink 
      href={href} 
      className={className} 
      onClick={onClick}
      target={target}
      rel={linkRel}
      {...props}
    >
      {children}
    </NextLink>
  );
});

Link.displayName = 'Link';

export default Link;
