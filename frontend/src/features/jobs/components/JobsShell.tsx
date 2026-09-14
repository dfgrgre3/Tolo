'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobsSidebar } from './JobsSidebar';
import { JobsDrawer, JobsDrawerContent, JobsDrawerTrigger } from './JobsDrawer';
import { jobsStrings } from '../labels';

/**
 * Responsive frame for every Jobs page.
 *
 * Desktop (lg+): a persistent sidebar beside the content.
 * Below that: the sidebar collapses into a drawer opened from a toolbar
 * button, rather than being shrunk — a 200px-wide nav rail on a phone is
 * unusable, so the navigation changes form instead of scale.
 */
export function JobsShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          {/* Sticky so navigation stays reachable through long result lists. */}
          <div className="sticky top-24">
            <JobsSidebar />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 lg:hidden">
            <JobsDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <JobsDrawerTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Menu className="h-4 w-4" />
                  {jobsStrings.jobs}
                </Button>
              </JobsDrawerTrigger>
              <JobsDrawerContent side="start" title={jobsStrings.jobs}>
                <JobsSidebar onNavigate={() => setDrawerOpen(false)} />
              </JobsDrawerContent>
            </JobsDrawer>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
