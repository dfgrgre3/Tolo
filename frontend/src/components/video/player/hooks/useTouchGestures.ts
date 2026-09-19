import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { SEEK_STEP_SECONDS, TEMPORARY_SPEED_RATE } from "../constants";
import { usePlayerSettings, usePlayerStores, usePlayerUI } from "../stores/player-scope";
import { clamp } from "../utils";

/**
 * Unified gesture state machine (P2-41).
 *
 * Previously click / double-click / touchstart-move-end / pointer handlers
 * lived in separate layers with separate timers (long-press vs tap vs drag
 * raced each other — e.g. a long-press release fired a click that toggled
 * playback). Now ONE machine owns the surface:
 *
 *   idle → pressed ──(500ms hold)──▶ speed (temporary 2x via player command)
 *      │                                │── release → idle (click suppressed)
 *      ├──(move > 12px, vertical)──▶ dragging (volume / brightness)
 *      │                                │── release → idle (click suppressed)
 *      └──(release, no move)──▶ tap ──(2nd tap < 280ms, sides)──▶ seek ∓10s
 *                              └──(single)──▶ toggle play / reveal controls
 *
 * Pointer events cover mouse + touch + pen uniformly (no more
 * event.detail sniffing or parallel touch/pointer tracks). The zoomed-in
 * pan mode stays in usePlayerViewport — the surface wires ONE of the two
 * handler sets depending on zoom (see CourseVideoPlayer).
 */
type GestureMode = "volume" | "brightness" | "seek" | "speed" | null;

type TouchGesturesOptions = {
  togglePlayPause: () => | Promise<void>;
  seekBy: (seconds: number) => void;
  handleVolumeChange: (volume: number) => void;
  resetControlsTimeout: () => void;
  /**
   * Player COMMAND (not a store mutation): drives the adapter AND the store
   * together so UI state can never diverge from the real media element.
   */
  beginTemporaryRate: (rate: number) => boolean;
  /** Restores the pre-gesture rate via adapter + store. No-op when inactive. */
  endTemporaryRate: () => void;
};

const LONG_PRESS_MS = 500;
const TAP_WINDOW_MS = 280;
const MOVE_THRESHOLD_PX = 12;

interface PressState {
  pointerId: number;
  startX: number;
  startY: number;
  mode: "volume" | "brightness";
  startValue: number;
  longpressFired: boolean;
  dragging: boolean;
}

export function useTouchGestures({
  togglePlayPause,
  seekBy,
  handleVolumeChange,
  resetControlsTimeout,
  beginTemporaryRate,
  endTemporaryRate,
}: TouchGesturesOptions) {
  // Live values are read from the stores at press-start (getState), never
  // captured in closures — the machine must not go stale between renders.
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);
  const showControls = usePlayerUI((s) => s.showControls);
  const stores = usePlayerStores();
  const [gestureActiveMode, setGestureActiveMode] = useState<GestureMode>(null);
  const [gestureValue, setGestureValue] = useState<number | string>(0);

  const pressRef = useRef<PressState | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const feedbackHideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = pressTimerRef.current;
    const feedback = feedbackHideTimeoutRef.current;
    return () => {
      if (timer) clearTimeout(timer);
      if (feedback) clearTimeout(feedback);
    };
  }, []);

  const flashGesture = useCallback((mode: Exclude<GestureMode, null>, value: number | string, hideAfterMs = 600) => {
    setGestureActiveMode(mode);
    setGestureValue(value);
    if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
    feedbackHideTimeoutRef.current = window.setTimeout(() => setGestureActiveMode(null), hideAfterMs);
  }, []);

  const cancelPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary) return;
    cancelPressTimer();
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const rightSide = x > bounds.width / 2;
    pressRef.current = {
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      mode: rightSide ? "volume" : "brightness",
      startValue: rightSide
        ? stores.playback.getState().volume
        : stores.settings.getState().brightness,
      longpressFired: false,
      dragging: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Non-critical: moves outside the element may be missed.
    }
    pressTimerRef.current = window.setTimeout(() => {
      const press = pressRef.current;
      if (!press || press.dragging) return;
      // Long press for temporary speed: a PLAYER COMMAND (adapter + store),
      // never a bare store mutation — the badge must reflect the real rate.
      if (beginTemporaryRate(TEMPORARY_SPEED_RATE)) {
        press.longpressFired = true;
        flashGesture("speed", `${TEMPORARY_SPEED_RATE}x`, 10_000);
      }
      pressTimerRef.current = null;
    }, LONG_PRESS_MS);
  }, [beginTemporaryRate, cancelPressTimer, flashGesture, stores]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.height <= 0) return;

    const dx = Math.abs(event.clientX - bounds.left - press.startX);
    const dy = Math.abs(event.clientY - bounds.top - press.startY);

    if (!press.dragging && !press.longpressFired && (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX)) {
      cancelPressTimer();
    }
    if (press.longpressFired) return;
    if (!press.dragging && (dx <= MOVE_THRESHOLD_PX && dy <= MOVE_THRESHOLD_PX)) return;
    // Vertical-dominant movement drives the value; horizontal is ignored
    // (seek lives on taps, not drags).
    if (!press.dragging && dy <= dx) return;

    press.dragging = true;
    const deltaRatio = (press.startY - (event.clientY - bounds.top)) / bounds.height;
    if (press.mode === "volume") {
      const nextVolume = clamp(press.startValue + deltaRatio, 0, 1);
      handleVolumeChange(nextVolume);
      flashGesture("volume", nextVolume, 1000);
    } else {
      const nextBrightness = clamp(press.startValue + deltaRatio, 0.6, 1.3);
      setSettingsState({ brightness: nextBrightness });
      flashGesture("brightness", (nextBrightness - 0.6) / (1.3 - 0.6), 1000);
    }
  }, [cancelPressTimer, flashGesture, handleVolumeChange, setSettingsState]);

  const endPress = useCallback((event: ReactPointerEvent<HTMLElement> | null, pointerId: number | null) => {
    const press = pressRef.current;
    cancelPressTimer();
    if (!press) return;
    if (pointerId !== null && pointerId !== press.pointerId) return;
    pressRef.current = null;
    if (event) {
      try {
        if (event.currentTarget.hasPointerCapture(press.pointerId)) {
          event.currentTarget.releasePointerCapture(press.pointerId);
        }
      } catch {
        // Best-effort.
      }
    }
    if (press.longpressFired) {
      endTemporaryRate();
      setGestureActiveMode(null);
      // The release click after a long-press must NOT toggle playback.
      suppressClickUntilRef.current = Date.now() + 400;
      return;
    }
    if (press.dragging) {
      if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
      feedbackHideTimeoutRef.current = window.setTimeout(() => setGestureActiveMode(null), 1000);
      // A drag release must NOT count as a tap.
      suppressClickUntilRef.current = Date.now() + 400;
    }
  }, [cancelPressTimer, endTemporaryRate]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    endPress(event, event.pointerId);
  }, [endPress]);

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    endPress(event, event.pointerId);
  }, [endPress]);

  const onClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const x = event.clientX - bounds.left;
    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Double-tap (mouse double-click AND mobile double-tap, one path):
    // sides seek, center falls through to toggle below.
    if (
      lastTap &&
      now - lastTap.time < TAP_WINDOW_MS &&
      Math.abs(lastTap.x - x) < bounds.width * 0.12
    ) {
      lastTapRef.current = null;
      if (x >= bounds.width * 0.66) {
        seekBy(SEEK_STEP_SECONDS);
        flashGesture("seek", `+${SEEK_STEP_SECONDS}`);
        return;
      }
      if (x <= bounds.width * 0.34) {
        seekBy(-SEEK_STEP_SECONDS);
        flashGesture("seek", `-${SEEK_STEP_SECONDS}`);
        return;
      }
    }
    lastTapRef.current = { time: now, x };

    if (!showControls) {
      resetControlsTimeout();
      return;
    }
    void togglePlayPause();
  }, [flashGesture, resetControlsTimeout, seekBy, showControls, togglePlayPause]);

  return {
    gestureActiveMode,
    gestureValue,
    surfaceHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick,
    },
  };
}
