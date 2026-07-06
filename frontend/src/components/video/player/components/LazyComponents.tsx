/**
 * Lazy-loaded video player components for code splitting
 * @module video/player/components/LazyComponents
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Loading fallback component
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
  </div>
);

// Lazy load heavy panels
export const LazySettingsPanel = lazy(() => 
  import("./panels/SettingsPanel").then(module => ({ default: module.SettingsPanel }))
);

export const LazySidebarPanel = lazy(() =>
  import("./panels/SidebarPanel").then(module => ({ default: module.SidebarPanel }))
);

export const LazyStatsPanel = lazy(() =>
  import("./panels/StatsPanel").then(module => ({ default: module.StatsPanel }))
);

export const LazyHelpPanel = lazy(() =>
  import("./panels/HelpPanel").then(module => ({ default: module.HelpPanel }))
);

// Lazy load overlays
export const LazyInteractiveQuestionOverlay = lazy(() =>
  import("./InteractiveQuestionOverlay").then(module => ({ default: module.InteractiveQuestionOverlay }))
);

export const LazyPlayerOverlays = lazy(() =>
  import("./PlayerOverlays").then(module => ({ default: module.PlayerOverlays }))
);

// Wrapper component with Suspense
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <ComponentLoader />
) {
  return function SuspendedComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Pre-wrapped lazy components
export const SuspendedSettingsPanel = withSuspense(LazySettingsPanel);
export const SuspendedSidebarPanel = withSuspense(LazySidebarPanel);
export const SuspendedStatsPanel = withSuspense(LazyStatsPanel);
export const SuspendedHelpPanel = withSuspense(LazyHelpPanel);
export const SuspendedInteractiveQuestionOverlay = withSuspense(LazyInteractiveQuestionOverlay);
export const SuspendedPlayerOverlays = withSuspense(LazyPlayerOverlays);
