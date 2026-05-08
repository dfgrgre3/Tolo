import { useEffect, useCallback } from "react";

type MediaSessionOptions = {
  title: string;
  enabled: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onNextTrack?: () => void;
};

/**
 * Integrates with the Media Session API to allow users to control playback
 * from notification areas, lock screens, and media hubs in the OS.
 */
export function useMediaSession({
  title,
  enabled,
  isPlaying,
  onPlay,
  onPause,
  onSeekForward,
  onSeekBackward,
  onNextTrack,
}: MediaSessionOptions) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "Thanawy Academy",
      album: "دروس تعليمية",
    });

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [enabled, title]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [enabled, isPlaying]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", onPlay],
      ["pause", onPause],
      ["seekforward", onSeekForward],
      ["seekbackward", onSeekBackward],
    ];

    if (onNextTrack) {
      handlers.push(["nexttrack", onNextTrack]);
    }

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Silently ignore unsupported actions
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Silently ignore
        }
      }
    };
  }, [enabled, onPlay, onPause, onSeekForward, onSeekBackward, onNextTrack]);
}
