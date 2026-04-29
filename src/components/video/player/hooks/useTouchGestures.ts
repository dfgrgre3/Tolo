import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { SEEK_STEP_SECONDS, CONTROLS_HIDE_TIMEOUT_MS } from "../constants";
import { useCourseVideoPlayerStore } from "../store";
import { clamp } from "../utils";
import { Volume2, SunMedium, FastForward } from "lucide-react";
import type { PlayerFeedback } from "../types";

type TouchGestureState = {
  mode: "volume" | "brightness" | null;
  startX: number;
  startY: number;
  startValue: number;
  moved: boolean;
};

type TouchGesturesOptions = {
  togglePlayPause: () => void | Promise<void>;
  seekBy: (seconds: number) => void;
  handleVolumeChange: (volume: number) => void;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
  resetControlsTimeout: () => void;
};

export function useTouchGestures({
  togglePlayPause,
  seekBy,
  handleVolumeChange,
  flashFeedback,
  resetControlsTimeout,
}: TouchGesturesOptions) {
  const { volume, brightness, showControls, setPlayerState } = useCourseVideoPlayerStore();
  const [gestureActiveMode, setGestureActiveMode] = useState<"volume" | "brightness" | null>(null);
  const [gestureValue, setGestureValue] = useState(0);
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const lastTapRef = useRef<{ timestamp: number; x: number } | null>(null);
  const feedbackHideTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const originalRateRef = useRef<number>(1);

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

      // Long press for 2x speed
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = window.setTimeout(() => {
        const store = useCourseVideoPlayerStore.getState();
        originalRateRef.current = store.playbackRate;
        setPlayerState({ playbackRate: 2 });
        setGestureActiveMode("speed");
        setGestureValue("2");
      }, 500);
    },
    [brightness, flashFeedback, seekBy, setPlayerState, volume]
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
        setPlayerState({ brightness: nextBrightness });
        setGestureActiveMode("brightness");
        setGestureValue((nextBrightness - 0.6) / (1.3 - 0.6)); // Normalize for UI
      }

      if (feedbackHideTimeoutRef.current) clearTimeout(feedbackHideTimeoutRef.current);
    },
    [handleVolumeChange, setPlayerState]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    const store = useCourseVideoPlayerStore.getState();
    if (store.playbackRate === 2 && originalRateRef.current !== 2) {
      setPlayerState({ playbackRate: originalRateRef.current });
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
  }, []);

  return {
    handleSurfaceTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    gestureActiveMode,
    gestureValue,
  };
}
