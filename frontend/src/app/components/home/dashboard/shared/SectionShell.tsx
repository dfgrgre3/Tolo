'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DASH_SECTION, DASH_SECTION_HEADER, DASH_EMPTY } from './design-system';

interface DashSectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Renders a "عرض الكل" style link on the opposite side of the header. */
  href?: string;
  linkLabel?: string;
  /** Custom control rendered instead of the link (refresh button, counter…). */
  action?: React.ReactNode;
  /** Extra row under the header — tab strips, filters. */
  toolbar?: React.ReactNode;
  /** Rails need overflow handling on the panel. */
  rail?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The single visual container for every dashboard section: a flat bordered
 * panel with a compact right-aligned header. Keeps the Noon-style rhythm
 * identical everywhere without each section re-declaring it.
 */
export function DashSection({
  title,
  subtitle,
  icon: Icon,
  href,
  linkLabel = 'عرض الكل',
  action,
  toolbar,
  rail = false,
  className = '',
  children,
}: DashSectionProps) {
  return (
    <section className={`${rail ? DASH_SECTION.panelRail : DASH_SECTION.panel} ${className}`}>
      <div className={DASH_SECTION_HEADER.container}>
        <div className={DASH_SECTION_HEADER.content}>
          <span className={DASH_SECTION_HEADER.accentBar} aria-hidden="true" />
          <div className={DASH_SECTION_HEADER.titleWrap}>
            <h2 className={DASH_SECTION_HEADER.title}>
              {Icon && <Icon className={`${DASH_SECTION_HEADER.icon} inline-block ml-1 -mt-0.5`} aria-hidden="true" />}
              {title}
            </h2>
            {subtitle && <p className={DASH_SECTION_HEADER.subtitle}>{subtitle}</p>}
          </div>
        </div>

        {action ??
          (href && (
            <Link href={href} className={DASH_SECTION_HEADER.viewAllButton}>
              {linkLabel}
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ))}
      </div>

      {toolbar && <div className="mb-4">{toolbar}</div>}

      {children}
    </section>
  );
}

interface DashEmptyProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional control under the copy — retry button, CTA… */
  action?: React.ReactNode;
}

/** Shared empty state so no section invents its own layout for "no data". */
export function DashEmpty({ icon: Icon, title, description, action }: DashEmptyProps) {
  return (
    <div className={DASH_EMPTY.container}>
      {Icon && <Icon className={DASH_EMPTY.icon} aria-hidden="true" />}
      <p className={DASH_EMPTY.title}>{title}</p>
      {description && <p className={DASH_EMPTY.description}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
