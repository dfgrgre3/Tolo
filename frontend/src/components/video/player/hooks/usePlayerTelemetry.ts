/**
 * Player telemetry (P2-35).
 *
 * Privacy-first by construction: events carry lesson/course identity,
 * provider, quality, bitrate, positions and timings — NEVER user text,
 * notes, answers, or tokens.
 *
 * Collection is store-driven (no call-site wiring): the hook subscribes to
 * playback/settings/UI transitions and derives play, pause, buffering,
 * quality/audio/subtitle changes and errors. Lifecycle moments the stores
 * can't see (initialized, source loaded, completion, exit) are recorded via
 * the returned `track()` from CourseVideoPlayer.
 *
 * Sink: an in-memory ring buffer (cap 200, exposed for debugging) + a
 * pluggable `sink`. The default sink only buffers; wiring it to
 * POST /api/events/ingest is a backend-contract decision (batch shape
 * documented below) — no blind POSTs to unknown contracts.
 */
import { useCallback, useEffect, useRef } from "react";
import { usePlayerPlayback, usePlayerSettings, usePlayerUI } from "../stores/player-scope";
import type { VideoProvider } from "../types";

export type PlayerTelemetryEventType =
  | "player_initialized"
  | "source_loaded"
  | "play"
  | "pause"
  | "first_frame"
  | "buffer_start"
  | "buffer_end"
  | "seek"
  | "quality_change"
  | "audio_change"
  | "subtitle_change"
  | "error"
  | "completion"
  | "cast_start"
  | "cast_end"
  | "exit";

export interface PlayerTelemetryEvent {
  type: PlayerTelemetryEventType;
  /** Epoch ms. */
  at: number;
  lessonId: string;
  courseId: string;
  provider: VideoProvider;
  positionSeconds?: number;
  durationSeconds?: number;
  playbackRate?: number;
  qualityKey?: string;
  bitrate?: number;
  errorCode?: string;
  extra?: Record<string, unknown>;
}

export type TelemetrySink = (events: PlayerTelemetryEvent[]) => void;

const RING_CAP = 200;

type TelemetryContext = {
  lessonId: string;
  courseId: string;
  getProvider: () => VideoProvider;
  sink?: TelemetrySink;
};

export function usePlayerTelemetry({ lessonId, courseId, getProvider, sink }: TelemetryContext) {
  const bufferRef = useRef<PlayerTelemetryEvent[]>([]);
  const ctxRef = useRef({ lessonId, courseId, getProvider, sink });
  useEffect(() => {
    ctxRef.current = { lessonId, courseId, getProvider, sink };
  }, [lessonId, courseId, getProvider, sink]);

  const track = useCallback(
    (type: PlayerTelemetryEventType, payload: Partial<PlayerTelemetryEvent> = {}) => {
      const ctx = ctxRef.current;
      const event: PlayerTelemetryEvent = {
        type,
        at: Date.now(),
        lessonId: ctx.lessonId,
        courseId: ctx.courseId,
        provider: ctx.getProvider(),
        ...payload,
      };
      const buffer = bufferRef.current;
      buffer.push(event);
      if (buffer.length > RING_CAP) buffer.splice(0, buffer.length - RING_CAP);
      try {
        ctx.sink?.([event]);
      } catch {
        // Telemetry must never break playback.
      }
      return event;
    },
    []
  );

  // Store-driven transitions live in usePlayerTelemetrySubscriptions below
  // (kept separate so CourseVideoPlayer stays orchestration-only).

  return { track, getEvents: () => [...bufferRef.current], getStartupStats: () => deriveStartupStats(bufferRef.current) };
}

/**
 * P3-54: startup performance from the event log (all client-side,
 * no extra instrumentation):
 * - timeToReadyMs:   initialized → source_loaded
 * - timeToFirstFrameMs: initialized → first_frame
 * Nulls when the milestone hasn't happened yet (still loading / error).
 */
export interface StartupStats {
  timeToReadyMs: number | null;
  timeToFirstFrameMs: number | null;
}

export function deriveStartupStats(events: PlayerTelemetryEvent[]): StartupStats {
  const at = (type: PlayerTelemetryEventType): number | null => {
    const found = events.find((e) => e.type === type);
    return found ? found.at : null;
  };
  const initialized = at("player_initialized");
  const loaded = at("source_loaded");
  const firstFrame = at("first_frame");
  return {
    timeToReadyMs:
      initialized !== null && loaded !== null ? Math.max(0, loaded - initialized) : null,
    timeToFirstFrameMs:
      initialized !== null && firstFrame !== null ? Math.max(0, firstFrame - initialized) : null,
  };
}

/**
 * Subscribes to the granular store slices telemetry derives from. Kept as a
 * separate hook so CourseVideoPlayer stays orchestration-only: it maps store
 * transitions to track() calls.
 */
export function usePlayerTelemetrySubscriptions(track: (type: PlayerTelemetryEventType, payload?: Partial<PlayerTelemetryEvent>) => void) {
  const isPlaying = usePlayerPlayback((s) => s.isPlaying);
  const isLoading = usePlayerPlayback((s) => s.isLoading);
  const currentTime = usePlayerPlayback((s) => s.currentTime);
  const duration = usePlayerPlayback((s) => s.duration);
  const playbackRate = usePlayerPlayback((s) => s.playbackRate);
  const errorMessage = usePlayerUI((s) => s.errorMessage);
  const selectedQualityKey = usePlayerSettings((s) => s.selectedQualityKey);
  const currentAutoBitrate = usePlayerSettings((s) => s.currentAutoBitrate);
  const selectedAudioTrack = usePlayerSettings((s) => s.selectedAudioTrack);
  const selectedSubtitle = usePlayerSettings((s) => s.selectedSubtitle);

  const prevRef = useRef({
    isPlaying: false,
    isLoading: true,
    quality: "auto",
    audio: "auto",
    subtitle: "off",
    error: null as string | null,
    firstFrameSeen: false,
    initialized: false,
  });

  useEffect(() => {
    const prev = prevRef.current;
    if (!prev.initialized) {
      prev.initialized = true;
      prev.isPlaying = isPlaying;
      prev.isLoading = isLoading;
      prev.quality = selectedQualityKey;
      prev.audio = selectedAudioTrack;
      prev.subtitle = selectedSubtitle;
      prev.error = errorMessage;
      return;
    }
    if (isPlaying !== prev.isPlaying) {
      prev.isPlaying = isPlaying;
      track(isPlaying ? "play" : "pause", {
        positionSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
        playbackRate,
      });
    }
    if (isLoading !== prev.isLoading) {
      const wasLoading = prev.isLoading;
      prev.isLoading = isLoading;
      if (wasLoading && !isLoading && duration > 0) {
        if (!prev.firstFrameSeen && isPlaying) {
          prev.firstFrameSeen = true;
          track("first_frame", {
            positionSeconds: Math.round(currentTime),
            durationSeconds: Math.round(duration),
          });
        } else {
          track("buffer_end", { positionSeconds: Math.round(currentTime) });
        }
      } else if (!wasLoading && isLoading && isPlaying) {
        track("buffer_start", { positionSeconds: Math.round(currentTime) });
      }
    }
    if (selectedQualityKey !== prev.quality) {
      prev.quality = selectedQualityKey;
      track("quality_change", { qualityKey: selectedQualityKey, bitrate: currentAutoBitrate ?? undefined });
    }
    if (selectedAudioTrack !== prev.audio) {
      prev.audio = selectedAudioTrack;
      track("audio_change", { extra: { trackId: selectedAudioTrack } });
    }
    if (selectedSubtitle !== prev.subtitle) {
      prev.subtitle = selectedSubtitle;
      track("subtitle_change", { extra: { subtitleId: selectedSubtitle } });
    }
    if (errorMessage !== prev.error) {
      prev.error = errorMessage;
      if (errorMessage) track("error", { errorCode: errorMessage.slice(0, 120) });
    }
  }, [isPlaying, isLoading, currentTime, duration, playbackRate, errorMessage, selectedQualityKey, currentAutoBitrate, selectedAudioTrack, selectedSubtitle, track]);
}
