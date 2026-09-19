import { useEffect, useRef, type RefObject } from "react";
import { usePlayerSettings, usePlayerUI, usePlayerStores, usePlayerScope } from "../stores/player-scope";

/**
 * Mini-player controller (P1-14).
 *
 * Rules:
 * - Auto-floats when the player scrolls out of view WHILE playing (and not
 *   fullscreen) — never while paused.
 * - An explicit user dismiss (`miniPlayerDismissed`) sticks until the player
 *   scrolls back into view. Without this the observer re-triggers instantly
 *   and the close button is a lie.
 * - Draggable via the `[data-minidrag]` handle (pointer events, works for
 *   touch with `touch-action: none`). Offset resets on lesson change and
 *   when leaving mini mode.
 */
export function useMiniPlayer(containerRef: RefObject<HTMLDivElement | null>) {
  const setUIState = usePlayerUI((state) => state.setUIState);
  const isMiniPlayer = usePlayerUI((state) => state.isMiniPlayer);
  // P2-43: "off" disables auto-float entirely (explicit user preference).
  const miniPlayerMode = usePlayerSettings((state) => state.miniPlayerMode);
  const stores = usePlayerStores();
  const scope = usePlayerScope();
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const resetDragPosition = (container: HTMLElement | null) => {
    dragOffsetRef.current = null;
    if (container) container.style.transform = "";
  };

  // Lesson change → fresh position and a cleared dismiss (scoped stores are
  // also fresh, but the DOM transform persists on the reused node).
  useEffect(() => {
    resetDragPosition(containerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed reset on lesson identity
  }, [scope?.lessonId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          // Back in view: dock and re-arm auto-float for the next scroll-out.
          const { isMiniPlayer: floating, miniPlayerDismissed: dismissed } =
            stores.ui.getState();
          if (floating || dismissed) {
            resetDragPosition(container);
            setUIState({ isMiniPlayer: false, miniPlayerDismissed: false });
          }
          return;
        }
        if (stores.settings.getState().miniPlayerMode === "off") return;
        const { isPlaying } = stores.playback.getState();
        const { isFullscreen, miniPlayerDismissed } = stores.ui.getState();
        if (isPlaying && !isFullscreen && !miniPlayerDismissed) {
          setUIState({ isMiniPlayer: true });
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, miniPlayerMode, setUIState, stores]);

  // Drag support for the floating player.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMiniPlayer) {
      if (!isMiniPlayer) resetDragPosition(container);
      return;
    }
    const handle = container.querySelector<HTMLElement>("[data-minidrag]");
    if (!handle) return;

    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let dragging = false;
    let pointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      dragging = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      baseX = dragOffsetRef.current?.x ?? 0;
      baseY = dragOffsetRef.current?.y ?? 0;
      handle.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < 8) return;
      dragging = true;
      const next = { x: baseX + dx, y: baseY + dy };
      dragOffsetRef.current = next;
      container.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      // A tap (no drag) on the handle must not be swallowed — release without
      // side effects; underlying controls receive their own events.
      dragging = false;
    };

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
    };
  }, [containerRef, isMiniPlayer]);
}
