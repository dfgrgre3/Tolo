'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useJobsOverview } from '@/hooks/use-jobs';
import { jobsStrings } from '../labels';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Requires a signed-in user; hidden entirely for anonymous visitors. */
  requiresAuth?: boolean;
  /** Key into the overview counts used to render a badge. */
  badge?: 'applied' | 'saved';
}

/**
 * Navigation for the Jobs module.
 *
 * Only the sections backed by shipped routes appear here. The module's wider
 * information architecture (alerts, interviews, offers, career profile,
 * employer console) is intentionally absent rather than rendered as dead
 * links — a nav entry that leads nowhere is worse than no entry.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/jobs', label: jobsStrings.overview, icon: LayoutGrid },
  { href: '/jobs/search', label: jobsStrings.findJobs, icon: Search },
  { href: '/jobs/saved', label: jobsStrings.savedJobs, icon: Bookmark, requiresAuth: true, badge: 'saved' },
  {
    href: '/jobs/applications',
    label: jobsStrings.myApplications,
    icon: FileText,
    requiresAuth: true,
    badge: 'applied',
  },
  { href: '/jobs/companies', label: jobsStrings.companies, icon: Building2 },
];

function isActive(pathname: string, href: string): boolean {
  // "/jobs" must not light up for every nested route, so the root is matched
  // exactly while the rest match by prefix.
  if (href === '/jobs') return pathname === '/jobs';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function JobsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { data: overview } = useJobsOverview(isAuthenticated);

  const items = NAV_ITEMS.filter((item) => !item.requiresAuth || isAuthenticated);

  return (
    <nav aria-label={jobsStrings.jobs} className="space-y-1">
      <div className="mb-4 flex items-center gap-2 px-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold">{jobsStrings.jobs}</span>
      </div>

      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.badge ? overview?.[item.badge] : undefined;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {typeof count === 'number' && count > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {count.toLocaleString('ar-EG')}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
