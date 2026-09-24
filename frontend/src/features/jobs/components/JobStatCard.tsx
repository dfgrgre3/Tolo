import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

/**
 * One tile of a seeker's overview counts.
 *
 * Extracted from the /jobs overview page so it can serve /jobs/profile too:
 * one implementation means the two surfaces cannot drift apart visually, and a
 * count whose route has not shipped simply renders without a link.
 */
export function JobStatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  href?: string;
}) {
  const body = (
    <Card className={href ? 'transition-colors hover:border-primary/40' : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold tabular-nums">
            {value === undefined ? '—' : value.toLocaleString('ar-EG')}
          </p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}
