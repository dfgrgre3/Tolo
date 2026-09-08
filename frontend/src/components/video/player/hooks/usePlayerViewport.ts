import { useCallback, useRef, type PointerEvent } from "react";
import { clamp } from "../utils";
import { useSettingsStore } from "../stores/settings-store";

/** Owns pointer-based panning while the player is zoomed. */
export function usePlayerViewport() {
  const setSettingsState = useSettingsStore((state) => state.setSettingsState);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const state = useSettingsStore.getState();
    if (state.zoomFactor <= 1) return;
    isPanningRef.current = true;
    startPanRef.current = { x: event.clientX - state.panOffset.x, y: event.clientY - state.panOffset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (!isPanningRef.current) return;
    const state = useSettingsStore.getState();
    setSettingsState({ panOffset: {
      x: clamp(event.clientX - startPanRef.current.x, -(state.zoomFactor - 1) * 350, (state.zoomFactor - 1) * 350),
      y: clamp(event.clientY - startPanRef.current.y, -(state.zoomFactor - 1) * 200, (state.zoomFactor - 1) * 200),
    } });
  }, [setSettingsState]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
