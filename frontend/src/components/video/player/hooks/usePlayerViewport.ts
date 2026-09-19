import { useCallback, useRef, type PointerEvent } from "react";
import { clamp } from "../utils";
import { usePlayerSettings, usePlayerStores } from "../stores/player-scope";

/** Owns pointer-based panning while the player is zoomed. */
export function usePlayerViewport() {
  const setSettingsState = usePlayerSettings((state) => state.setSettingsState);
  const stores = usePlayerStores();
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = stores.settings.getState();
    if (state.zoomFactor <= 1) return;
    isPanningRef.current = true;
    startPanRef.current = { x: event.clientX - state.panOffset.x, y: event.clientY - state.panOffset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [stores]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!isPanningRef.current) return;
    const state = stores.settings.getState();
    setSettingsState({ panOffset: {
      x: clamp(event.clientX - startPanRef.current.x, -(state.zoomFactor - 1) * 350, (state.zoomFactor - 1) * 350),
      y: clamp(event.clientY - startPanRef.current.y, -(state.zoomFactor - 1) * 200, (state.zoomFactor - 1) * 200),
    } });
  }, [setSettingsState, stores]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
