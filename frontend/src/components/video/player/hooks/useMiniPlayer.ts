import { useEffect, type RefObject } from "react";
import { usePlaybackStore } from "../stores/playback-store";
import { useUIStore } from "../stores/ui-store";

export function useMiniPlayer(containerRef: RefObject<HTMLDivElement | null>) {
  const setUIState = useUIStore((state) => state.setUIState);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const shouldFloat = !entry.isIntersecting &&
          usePlaybackStore.getState().isPlaying &&
          !useUIStore.getState().isFullscreen;
        setUIState({ isMiniPlayer: shouldFloat });
      },
      { threshold: 0.15 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, setUIState]);
}
