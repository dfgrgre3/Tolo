'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A side drawer for the Jobs module (mobile navigation, filter panel).
 *
 * The shared `components/ui/dialog` is a centered modal only, and this module
 * needs an edge-anchored panel. Rather than change that shared component's
 * behaviour for every existing caller, this builds the drawer on the same
 * Radix primitive — so it inherits focus trapping, scroll locking, Escape
 * handling and the required aria wiring rather than re-implementing them.
 *
 * The panel is anchored with logical properties (`start`/`end`), so it opens
 * from the correct side automatically under the app's RTL direction.
 */

export const JobsDrawer = DialogPrimitive.Root;
export const JobsDrawerTrigger = DialogPrimitive.Trigger;
export const JobsDrawerClose = DialogPrimitive.Close;

export const JobsDrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Which edge the panel is anchored to. Defaults to the inline start. */
    side?: 'start' | 'end' | 'bottom';
    title: string;
    description?: string;
  }
>(({ className, children, side = 'start', title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/60'
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 border border-border bg-background p-4 shadow-lg',
        side === 'bottom'
          ? 'inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl'
          : [
              'inset-y-0 w-[85vw] max-w-sm overflow-y-auto',
              side === 'start' ? 'start-0' : 'end-0',
            ],
        className
      )}
      {...props}
    >
      {/*
        Radix requires a Title for every dialog and warns without a
        Description. Both are provided here and visually hidden when the
        caller renders its own heading, so screen readers always announce
        what opened.
      */}
      <div className="flex items-center justify-between">
        <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">إغلاق</span>
        </DialogPrimitive.Close>
      </div>
      <DialogPrimitive.Description className={description ? 'text-sm text-muted-foreground' : 'sr-only'}>
        {description ?? title}
      </DialogPrimitive.Description>

      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
JobsDrawerContent.displayName = 'JobsDrawerContent';
