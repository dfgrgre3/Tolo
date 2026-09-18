import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { SEEK_STEP_SECONDS, TEMPORARY_SPEED_RATE } from "../constants";
import { usePlayerPlayback, usePlayerSettings, usePlayerUI } from "../stores/player-scope";
import { clamp } from "../utils";

type TouchGestureState = {
  mode: "volume" | "brightness" | "seek" | "speed" | null;
  startX: number;
  startY: number;
  startValue: number;
  moved: boolean;
};

type TouchGesturesOptions = {
  togglePlayPause: () => | Promise<void>;
  seekBy: (seconds: number) => void;
  handleVolumeChange: (volume: number) => void;
  resetControlsTimeout: () => void;
  /**
   * Player COMMAND (not a store mutation): drives the adapter AND the store
   * together so UI state can never diverge from the real media element.
   * Returns false when the rate can't be applied (e.g. unsupported on
   * YouTube) — the gesture then shows nothing instead of a fake 2x badge.
   */
  beginTemporaryRate: (rate: number) => boolean;
  /** Restores the pre-gesture rate via adapter + store. No-op when inactive. */
  endTemporaryRate: () => void;
};

export function useTouchGestures({
  togglePlayPause,
  seekBy,
  handleVolumeChange,
  resetControlsTimeout,
  beginTemporaryRate,
  endTemporaryRate,
}: TouchGesturesOptions) {
  const volume = usePlayerPlayback((s) => s.volume);
  const brightness = usePlayerSettings((s) => s.brightness);
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);
  const showControls = usePlayerUI((s) => s.showControls);
  const [gestureActiveMode, setGestureActiveMode] = useState<"volume" | "brightness" | "seek" | "speed" | null>(null);
  const [gestureValue, setGestureValue] = useState<number | string>(0);
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const lastTapRef = useRef<{ timestamp: number; x: number } | null>(null);
  const feedbackHideTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const tempSpeedActiveRef = useRef(false);

  const handleSurfaceTap = useCallback(
    async (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.detail === 2) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const xRatio = (event.clientX - bounds.left) / bounds.width;
        if (xRatio >= 0.66) {
          seekBy(SEEK_STEP_SECONDS);
          setGestureActiveMode("seek");
          setGestureValue(`+${SEEK_STEP_SECONDS}`);
          if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
          feedbackHideTimeoutRef.current = window.setTimeout(() => setGestureActiveMode(null), 600);
          return;
        }
        if (xRatio <= 0.34) {
          seekBy(-SEEK_STEP_SECONDS);
          setGestureActiveMode("seek");
          setGestureValue(`-${SEEK_STEP_SECONDS}`);
          if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
          feedbackHideTimeoutRef.current = window.setTimeout(() => setGestureActiveMode(null), 600);
          return;
        }
      }

      if (!showControls) {
        resetControlsTimeout();
        return;
      }

      await togglePlayPause();
    },
    [resetControlsTimeout, seekBy, showControls, togglePlayPause]
  );

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLButtonElement>) => {
      const touch = event.touches[0];
      if (!touch) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const now = Date.now();
      const x = touch.clientX - bounds.left;
      const y = touch.clientY - bounds.top;

      if (
        lastTapRef.current &&
        now - lastTapRef.current.timestamp < 280 &&
        Math.abs(lastTapRef.current.x - x) < bounds.width * 0.12
      ) {
        if (x >= bounds.width * 0.66) {
          seekBy(SEEK_STEP_SECONDS);
        } else if (x <= bounds.width * 0.34) {
          seekBy(-SEEK_STEP_SECONDS);
        }
      }

      lastTapRef.current = { timestamp: now, x };
      touchGestureRef.current = {
        mode: x > bounds.width / 2 ? "volume" : "brightness",
        startX: x,
        startY: y,
        startValue: x > bounds.width / 2 ? volume : brightness,
        moved: false,
      };

      // Long press for temporary speed: a PLAYER COMMAND (adapter + store),
      // never a bare store mutation — the badge must reflect the real rate.
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = window.setTimeout(() => {
        if (beginTemporaryRate(TEMPORARY_SPEED_RATE)) {
          tempSpeedActiveRef.current = true;
          setGestureActiveMode("speed");
          setGestureValue(`${TEMPORARY_SPEED_RATE}x`);
        }
      }, 500);
    },
    [beginTemporaryRate, brightness, seekBy, volume]
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLButtonElement>) => {
      const gesture = touchGestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const nextX = touch.clientX - bounds.left;
      const nextY = touch.clientY - bounds.top;
      const deltaYRatio = (gesture.startY - nextY) / bounds.height;
      const deltaX = Math.abs(nextX - gesture.startX);
      const deltaY = Math.abs(nextY - gesture.startY);

      if (!gesture.moved && deltaY < 12 && deltaX < 12) {
        return;
      }

      if (deltaY > 12 || deltaX > 12) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      }

      if (deltaY <= deltaX) {
        return;
      }

      gesture.moved = true;
      event.preventDefault();

      if (gesture.mode === "volume") {
        const nextVolume = clamp(gesture.startValue + deltaYRatio, 0, 1);
        handleVolumeChange(nextVolume);
        setGestureActiveMode("volume");
        setGestureValue(nextVolume);
      } else if (gesture.mode === "brightness") {
        const nextBrightness = clamp(gesture.startValue + deltaYRatio, 0.6, 1.3);
        setSettingsState({ brightness: nextBrightness });
        setGestureActiveMode("brightness");
        setGestureValue((nextBrightness - 0.6) / (1.3 - 0.6)); // Normalize for UI
      }

      if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
    },
    [handleVolumeChange, setSettingsState]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (tempSpeedActiveRef.current) {
      tempSpeedActiveRef.current = false;
      endTemporaryRate();
      setGestureActiveMode(null);
    }

    const gesture = touchGestureRef.current;
    
    feedbackHideTimeoutRef.current = window.setTimeout(() => {
      setGestureActiveMode(null);
    }, 1000);

    if (!gesture?.moved) {
      touchGestureRef.current = null;
      return;
    }

    touchGestureRef.current = null;
  }, [endTemporaryRate]);

  return {
    handleSurfaceTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    gestureActiveMode,
    gestureValue,
  };
}
