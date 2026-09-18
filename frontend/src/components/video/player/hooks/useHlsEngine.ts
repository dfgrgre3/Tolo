import { useEffect, useRef, type MutableRefObject } from "react";
import { Sparkles } from "lucide-react";
import { usePlayerPlayback, usePlayerSettings, usePlayerUI } from "../stores/player-scope";
import { shouldUseHls } from "../utils";
import { AUTO_QUALITY_KEY } from "../constants";
import type { AudioTrack, PlayerFeedback, QualityOption, VideoProvider } from "../types";
import type Hls from "hls.js";


type HlsEngineOptions = {
  activeVideoUrl: string;
  provider: VideoProvider;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
};

// P1-11: quality identity is a stable `key` ("1080p"), NOT the level index.
// The index is kept only as the transient engine handle (`levelIndex`);
// manifests may reorder levels, so the UI must never treat it as identity.
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
}: HlsEngineOptions) {
  const setPlaybackState = usePlayerPlayback((s) => s.setPlaybackState);
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);
  const setUIState = usePlayerUI((s) => s.setUIState);
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

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            retryState.network += 1;
            lowerQuality();
            if (retryState.network <= 4) {
              hlsRetryTimeoutRef.current = window.setTimeout(() => {
                hls.startLoad();
              }, Math.min(1200 * retryState.network, 5000));
              flashFeedback({
                icon: Sparkles,
                label: "نعيد محاولة الاتصال بجودة أقل...",
              });
              return;
            }
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            retryState.media += 1;
            if (retryState.media <= 2) {
              lowerQuality();
              hls.recoverMediaError();
              flashFeedback({
                icon: Sparkles,
                label: "جارٍ استعادة البث...",
              });
              return;
            }
          }

          hls.destroy();
          setUIState({
            errorMessage: "تعذر تشغيل البث الحالي بعد عدة محاولات.",
          });
          setPlaybackState({ isLoading: false });
        });
      } catch (err) {
        console.error("Failed to load HLS engine dynamically:", err);
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
  }, [activeVideoUrl, flashFeedback, provider, setPlaybackState, setSettingsState, setUIState, videoRef]);

  // P1-12: live audio-track switching without re-initializing the engine.
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    applyHlsAudioTrack(hls, selectedAudioTrack);
  }, [selectedAudioTrack]);

  return hlsRef;
}
