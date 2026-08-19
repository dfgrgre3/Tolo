"use client";

import { useEfficiencyMode } from "@/hooks/use-efficiency-mode";

/**
 * Fixed decorative backdrop for the dashboard. The animated orbs are dropped
 * on low-powered devices, where they cost more than they add.
 */
export function AmbientBackground() {
  const isEfficiencyMode = useEfficiencyMode();

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,255,0.15),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,255,128,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,0,128,0.08),transparent_50%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />

      {!isEfficiencyMode && (
        <>
          <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute -bottom-40 right-1/3 w-[550px] h-[550px] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen" />
        </>
      )}
    </div>
  );
}
