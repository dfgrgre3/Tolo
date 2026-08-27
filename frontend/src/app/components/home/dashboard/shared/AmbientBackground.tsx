"use client";

/**
 * Fixed decorative backdrop for the dashboard.
 *
 * Noon-style: flat, light, no glow/neon — just the page background plus a
 * soft brand-color wash pinned to the top so the hero banner blends into it.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,hsl(var(--primary)/0.10),transparent)]" />
    </div>
  );
}
