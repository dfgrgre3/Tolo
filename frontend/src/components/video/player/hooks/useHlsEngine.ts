import { useEffect, useRef, type MutableRefObject } from "react";
import { Sparkles } from "lucide-react";
import { usePlayerPlayback, usePlayerSettings } from "../stores/player-scope";
import { isHlsManifestUrl, shouldUseHls } from "../utils";
import { AUTO_QUALITY_KEY } from "../constants";
import { mapHlsError, type RichPlayerError } from "../errors";
import { logger } from "@/lib/logger";
import type { AudioTrack, PlayerFeedback, QualityOption, VideoProvider } from "../types";
import type Hls from "hls.js";


type HlsEngineOptions = {
  activeVideoUrl: string;
  provider: VideoProvider;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
  /** Ordered failover manifests (P2-34), tried after the primary is exhausted. */
  fallbackUrls?: string[];
  /** Central error engine sink (P2-36): message + telemetry in one place. */
  onError?: (error: RichPlayerError) => void;
};

// P1-11: quality identity is a stable `key` ("1080p"), NOT the level index.
// The index is kept only as the transient engine handle (`levelIndex`);
// manifests may reorder levels, so the UI must never treat it as identity.
// P2-37: attempt budgets. Network gets more (often transient); media
// recovery rarely helps past a few tries — fail over instead of looping.
const MAX_NETWORK_ATTEMPTS = 5;
const MAX_MEDIA_ATTEMPTS = 3;

type HlsLevelInfo = { height?: number; bitrate?: number };

const parseQualities = (levels: HlsLevelInfo[]): QualityOption[] => {
  return levels
    .map((level, index) => {
      const height = level.height ?? 0;
      return {
        key: height > 0 ? `${height}p` : `level-${index}`,
        label: height > 0 ? `${height}p` : `L${index + 1}`,
        height: height > 0 ? height : undefined,
        bitrate: typeof level.bitrate === "number" ? level.bitrate : undefined,
        levelIndex: index,
      } satisfies QualityOption;
    })
    .filter((level, index, array) => {
      return array.findIndex((item) => item.key === level.key) === index;
    })
    .sort((left, right) => (right.height ?? 0) - (left.height ?? 0));
};

/** Engine index → stable key (for error-path fallbacks that only know the level). */
const qualityKeyForLevel = (qualities: QualityOption[], levelIndex: number): string => {
  if (levelIndex < 0) return AUTO_QUALITY_KEY;
  return qualities.find((q) => q.levelIndex === levelIndex)?.key ?? AUTO_QUALITY_KEY;
};

// P3-52: pure quality-mapping helpers, exported for unit tests.
export { parseQualities as buildQualityOptions, qualityKeyForLevel };

/** P1-12: apply a stable audio-track id to the HLS engine (ids are String(index)). */
const applyHlsAudioTrack = (hls: Hls, trackId: string) => {
  const tracks = hls.audioTracks ?? [];
  if (tracks.length === 0) return;
  if (trackId === "auto") {
    // Return to the manifest default (usually the first rendition).
    const defaultIdx = tracks.findIndex((t) => t.default);
    hls.audioTrack = defaultIdx >= 0 ? defaultIdx : 0;
    return;
  }
  const idx = Number(trackId);
  if (Number.isInteger(idx) && idx >= 0 && idx < tracks.length) {
    hls.audioTrack = idx;
  }
};

/** P1-12: project hls.js audio tracks into the player AudioTrack contract. */
const parseHlsAudioTracks = (tracks: Array<{ name?: string; lang?: string }> | undefined): AudioTrack[] => {
  return (tracks ?? []).map((t, i) => ({
    id: String(i),
    label: t.name || t.lang || `مسار ${i + 1}`,
    language: t.lang ?? "",
  }));
};

export function useHlsEngine({
  activeVideoUrl,
  provider,
  videoRef,
  flashFeedback,
  fallbackUrls = [],
  onError,
}: HlsEngineOptions) {
  const setPlaybackState = usePlayerPlayback((s) => s.setPlaybackState);
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);
  // NOTE: terminal failures report via onError (central error engine,
  // P2-36) — this hook never writes user-facing error strings itself.
  // P1-12: live selection mirror — the engine applies track switches without
  // re-running the setup effect (hls instance lives in a ref).
  const selectedAudioTrack = usePlayerSettings((s) => s.selectedAudioTrack);
  const selectedAudioTrackRef = useRef(selectedAudioTrack);
  useEffect(() => {
    selectedAudioTrackRef.current = selectedAudioTrack;
  }, [selectedAudioTrack]);
  const hlsRef = useRef<Hls | null>(null);
  const hlsRetryTimeoutRef = useRef<number | null>(null);
  const hlsRetryStateRef = useRef({ network: 0, media: 0 });
  // P2-34: failover cursor into fallbackUrls for THIS source.
  const fallbackIndexRef = useRef(0);
  const fallbackUrlsRef = useRef<string[]>(fallbackUrls);
  useEffect(() => {
    fallbackUrlsRef.current = fallbackUrls;
  }, [fallbackUrls]);
  // Latest parsed qualities for this manifest — lets error-path fallbacks
  // resolve an engine index back to a stable key without store access.
  const qualitiesRef = useRef<QualityOption[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (hlsRetryTimeoutRef.current) {
      clearTimeout(hlsRetryTimeoutRef.current);
    }
    hlsRetryStateRef.current = { network: 0, media: 0 };
    fallbackIndexRef.current = 0;
    qualitiesRef.current = [];

    if (!shouldUseHls(activeVideoUrl, provider)) {
      video.src = activeVideoUrl;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeVideoUrl;
      return;
    }

    let active = true;

    const initHls = async () => {
      try {
        const HlsModule = await import("hls.js");
        const Hls = HlsModule.default || HlsModule;

        if (!active) return;

        if (!Hls.isSupported()) {
          video.src = activeVideoUrl;
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          capLevelToPlayerSize: true,
          backBufferLength: 90,
        });

        hlsRef.current = hls;
        hls.loadSource(activeVideoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const qualities = parseQualities(hls.levels);
          qualitiesRef.current = qualities;
          const startLevel = hls.levels[hls.startLevel];
          // P1-12: discover audio renditions; re-apply the stored selection
          // or fall back to the default track when it vanished.
          const discoveredAudio = parseHlsAudioTracks(hls.audioTracks);
          const wanted = selectedAudioTrackRef.current;
          const wantedExists = wanted === "auto" || discoveredAudio.some((t) => t.id === wanted);
          const effectiveAudio = wantedExists ? wanted : "auto";
          if (effectiveAudio !== "auto") applyHlsAudioTrack(hls, effectiveAudio);
          setSettingsState({
            qualities,
            currentAutoQuality: startLevel?.height ?? null,
            currentAutoBitrate: startLevel?.bitrate ?? null,
            hlsAudioTracks: discoveredAudio,
            selectedAudioTrack: effectiveAudio,
          });
          setPlaybackState({ isLoading: false });
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          setSettingsState({
            currentAutoQuality: level?.height ?? null,
            currentAutoBitrate: level?.bitrate ?? null,
          });
        });

        // P1-12: if the engine switches audio on its own (error recovery),
        // the store follows — the store stays the single source of truth.
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setSettingsState({ selectedAudioTrack: String(data.id ?? "auto") });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          const retryState = hlsRetryStateRef.current;
          const lowerQuality = () => {
            if (hls.currentLevel > 0) {
              hls.currentLevel = hls.currentLevel - 1;
              // Report by stable key; the engine index is not UI identity.
              setSettingsState({
                selectedQualityKey: qualityKeyForLevel(qualitiesRef.current, hls.currentLevel),
              });
            }
          };

          // P2-37: retry with exponential backoff + jitter, network/visibility
          // aware. A background tab or a dead connection must not burn the
          // attempt budget — re-check conditions, then fire.
          const scheduleRetry = (fire: () => void, attempt: number) => {
            if (hlsRetryTimeoutRef.current) clearTimeout(hlsRetryTimeoutRef.current);
            const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), 15000) + Math.random() * 500;
            hlsRetryTimeoutRef.current = window.setTimeout(() => {
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                flashFeedback({ icon: Sparkles, label: "بانتظار عودة الاتصال..." });
                scheduleRetry(fire, attempt); // attempt NOT consumed
                return;
              }
              if (typeof document !== "undefined" && document.hidden) {
                scheduleRetry(fire, attempt); // attempt NOT consumed
                return;
              }
              fire();
            }, delay);
          };

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            retryState.network += 1;
            // Quality drops only from the 2nd consecutive failure: the first
            // is usually transient (blip, CDN hiccup), not bandwidth.
            if (retryState.network >= 2) lowerQuality();
            if (retryState.network <= MAX_NETWORK_ATTEMPTS) {
              scheduleRetry(() => hls.startLoad(), retryState.network);
              flashFeedback({
                icon: Sparkles,
                label: retryState.network >= 2 ? "نعيد محاولة الاتصال بجودة أقل..." : "نعيد محاولة الاتصال...",
              });
              return;
            }
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            retryState.media += 1;
            if (retryState.media <= MAX_MEDIA_ATTEMPTS) {
              // Media recovery swaps/fixes the pipeline; dropping quality as
              // well only masks decoder issues, so recover in place.
              scheduleRetry(() => hls.recoverMediaError(), retryState.media);
              flashFeedback({
                icon: Sparkles,
                label: "جارٍ استعادة البث...",
              });
              return;
            }
          }

          // P2-34/38: primary exhausted — fail over through the source chain
          // (alternate HLS manifests, then progressive MP4) before surfacing
          // a terminal error.
          const fallbacks = fallbackUrlsRef.current;
          const nextFallback = fallbacks[fallbackIndexRef.current];
          if (nextFallback) {
            fallbackIndexRef.current += 1;
            hlsRetryStateRef.current = { network: 0, media: 0 };
            setPlaybackState({ isLoading: true });
            flashFeedback({
              icon: Sparkles,
              label: "جارٍ التبديل إلى مصدر بديل...",
            });
            try {
              if (isHlsManifestUrl(nextFallback)) {
                hls.loadSource(nextFallback);
              } else {
                // Progressive fallback: leave the HLS engine, let the plain
                // element (and its loadedmetadata/playing events) drive.
                hls.destroy();
                hlsRef.current = null;
                video.src = nextFallback;
              }
              return;
            } catch {
              // Fall through to the terminal error below.
            }
          }

          // Terminal: normalize through the central error engine (P2-36) —
          // one taxonomy, one message, one telemetry event.
          try {
            hls.destroy();
          } catch {
            // Already torn down — report anyway.
          }
          hlsRef.current = null;
          onError?.(mapHlsError(String(data.type), String(data.details ?? ""), provider));
          setPlaybackState({ isLoading: false });
        });
      } catch (err) {
        logger.error("Failed to load HLS engine dynamically:", err);
        video.src = activeVideoUrl;
      }
    };

    initHls();

    return () => {
      active = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (hlsRetryTimeoutRef.current) {
        clearTimeout(hlsRetryTimeoutRef.current);
      }
    };
  }, [activeVideoUrl, flashFeedback, onError, provider, setPlaybackState, setSettingsState, videoRef]);

  // P1-12: live audio-track switching without re-initializing the engine.
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    applyHlsAudioTrack(hls, selectedAudioTrack);
  }, [selectedAudioTrack]);

  return hlsRef;
}
