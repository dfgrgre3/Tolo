/**
 * Player controller actions (P2-32 — first structural slice of
 * CourseVideoPlayer.tsx).
 *
 * All user-initiated playback commands live here: every one drives the
 * ENGINE (adapter) and mirrors to the stores, per the source-of-truth
 * contract in types.ts. CourseVideoPlayer keeps orchestration (loops,
 * effects, render); this hook owns the verbs.
 */
import { useCallback, useMemo, useRef, type MutableRefObject, type RefObject } from "react";
import {
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AUTO_QUALITY_KEY } from "../constants";
import {
  usePlayerPlayback,
  usePlayerSettings,
  usePlayerStores,
} from "../stores/player-scope";
import { clamp } from "../utils";
import { getPlayerCapabilities } from "../capabilities";
import { createPlayerError, type ErrorReporter } from "../errors";
import type {
  PlayerFeedback,
  QualitySource,
  SubtitleTrack,
  VideoProvider,
} from "../types";
import type { PlayerAdapter } from "./usePlayerAdapter";
import type Hls from "hls.js";

type GetAdapter = () => PlayerAdapter | null;

type PlayerActionsOptions = {
  getAdapter: GetAdapter;
  syncPlaybackSnapshot: (force?: boolean) => void;
  lastPushedTimeRef: MutableRefObject<number>;
  pendingSourceSwitchRef: MutableRefObject<{ time: number; shouldResume: boolean } | null>;
  playerContainerRef: RefObject<HTMLDivElement | null>;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  hlsRef: MutableRefObject<Hls | null>;
  provider: VideoProvider;
  youtubePlaybackRates: number[];
  videoUrl: string;
  qualitySources: QualitySource[];
  subtitleTracks: SubtitleTrack[];
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
  setQualityOverride: (override: { forVideoUrl: string; src: string } | null) => void;
  resetControlsTimeout: () => void;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
  /** Central error engine sink (P2-36). */
  reportError: ErrorReporter;
};

/** Best-effort orientation lock/unlock (P2-40) — never throws. */
async function tryOrientationLock(orientation: "landscape" | "portrait"): Promise<void> {
  try {
    const screenOrientation = window.screen?.orientation as
      | { lock?: (o: string) => Promise<void>; unlock?: () => void }
      | undefined;
    await screenOrientation?.lock?.(orientation);
  } catch {
    // iOS Safari + insecure contexts reject — fullscreen still works.
  }
}

export async function releaseOrientationLock(): Promise<void> {
  try {
    const screenOrientation = window.screen?.orientation as
      | { unlock?: () => void }
      | undefined;
    screenOrientation?.unlock?.();
  } catch {
    // Best-effort teardown.
  }
}

export function usePlayerActions({
  getAdapter,
  syncPlaybackSnapshot,
  lastPushedTimeRef,
  pendingSourceSwitchRef,
  playerContainerRef,
  videoRef,
  hlsRef,
  provider,
  youtubePlaybackRates,
  videoUrl,
  qualitySources,
  subtitleTracks,
  isMuted,
  volume,
  isPlaying,
  setQualityOverride,
  resetControlsTimeout,
  flashFeedback,
  reportError,
}: PlayerActionsOptions) {
  const setPlaybackState = usePlayerPlayback((s) => s.setPlaybackState);
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);
  // NOTE: UI errors go through reportError (central error engine, P2-36) —
  // this module never writes user-facing error strings directly.
  const stores = usePlayerStores();

  const handleSeek = useCallback((value: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    const duration = adapter.getDuration();
    if (duration <= 0) return;
    const nextTime = clamp(value, 0, duration);
    adapter.seekTo(nextTime);
    setPlaybackState({ currentTime: nextTime, resumeTime: null, isEnded: false });
    lastPushedTimeRef.current = nextTime;
    syncPlaybackSnapshot(true);
    resetControlsTimeout();
  }, [getAdapter, lastPushedTimeRef, resetControlsTimeout, setPlaybackState, syncPlaybackSnapshot]);

  const seekBy = useCallback((seconds: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    const nextTime = adapter.getCurrentTime() + seconds;
    handleSeek(nextTime);
    flashFeedback({
      icon: seconds > 0 ? SkipForward : SkipBack,
      label: `${Math.abs(seconds)} ث`,
    });
  }, [flashFeedback, getAdapter, handleSeek]);

  const togglePlayPause = useCallback(async () => {
    const adapter = getAdapter();
    if (!adapter) return;
    try {
      if (stores.playback.getState().isPlaying) {
        adapter.pause();
        flashFeedback({ icon: Pause, label: "إيقاف مؤقت" });
      } else {
        await adapter.play();
        flashFeedback({ icon: Play, label: "تشغيل" });
      }
    } catch {
      reportError(createPlayerError("MEDIA", provider, { technicalCause: "action:toggle-play" }));
    }
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, provider, reportError, resetControlsTimeout, stores.playback]);

  const toggleMute = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;
    const nextMuted = !isMuted;
    adapter.setMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      adapter.setVolume(0.5);
      setPlaybackState({ volume: 0.5 });
    }
    setPlaybackState({ isMuted: nextMuted });
    flashFeedback({ icon: nextMuted ? VolumeX : Volume2, label: nextMuted ? "كتم" : "صوت" });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, isMuted, resetControlsTimeout, setPlaybackState, volume]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    const safeVolume = clamp(nextVolume, 0, 1);
    adapter.setVolume(safeVolume);
    adapter.setMuted(safeVolume === 0);
    setPlaybackState({ volume: safeVolume, isMuted: safeVolume === 0 });
    resetControlsTimeout();
  }, [getAdapter, resetControlsTimeout, setPlaybackState]);

  const handlePlaybackRateChange = useCallback((nextRate: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    if (provider === "youtube" && !youtubePlaybackRates.includes(nextRate)) {
      flashFeedback({ icon: Settings2, label: "هذه السرعة غير مدعومة على YouTube" });
      return;
    }
    // P2-42: gesture → command → engine → (read-back) → store. The store
    // mirrors what the media runs at, never the requested wish.
    adapter.setPlaybackRate(nextRate);
    const effective = adapter.getPlaybackRate();
    const stored = Number.isFinite(effective) && effective > 0 ? effective : nextRate;
    setPlaybackState({ playbackRate: stored });
    flashFeedback({ icon: Settings2, label: `${stored}x` });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, provider, resetControlsTimeout, setPlaybackState, youtubePlaybackRates]);

  // Temporary speed gesture as a PLAYER COMMAND (P1-8): adapter + store
  // together, never a bare store mutation.
  const tempRateRef = useRef<number | null>(null);
  const beginTemporaryRate = useCallback((rate: number) => {
    if (tempRateRef.current !== null) return true;
    const adapter = getAdapter();
    if (!adapter) return false;
    if (provider === "youtube" && !youtubePlaybackRates.includes(rate)) return false;
    tempRateRef.current = stores.playback.getState().playbackRate;
    adapter.setPlaybackRate(rate);
    // P2-42: store the engine read-back, not the wish.
    const effective = adapter.getPlaybackRate();
    setPlaybackState({ playbackRate: Number.isFinite(effective) && effective > 0 ? effective : rate });
    return true;
  }, [getAdapter, provider, setPlaybackState, stores.playback, youtubePlaybackRates]);

  const endTemporaryRate = useCallback(() => {
    const previous = tempRateRef.current;
    if (previous === null) return;
    tempRateRef.current = null;
    const adapter = getAdapter();
    adapter?.setPlaybackRate(previous);
    const effective = adapter?.getPlaybackRate();
    setPlaybackState({
      playbackRate: effective !== undefined && Number.isFinite(effective) && effective > 0 ? effective : previous,
    });
  }, [getAdapter, setPlaybackState]);

  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        await releaseOrientationLock();
      } else {
        await container.requestFullscreen();
        // P2-40: on touch-sized viewports prefer landscape with the
        // orientation locked (best-effort — iOS Safari ignores lock()).
        if (getPlayerCapabilities().touch) {
          await tryOrientationLock("landscape");
        }
      }
    } catch {
      reportError(createPlayerError("UNSUPPORTED", provider, { technicalCause: "action:fullscreen" }));
    }
    resetControlsTimeout();
  }, [playerContainerRef, provider, reportError, resetControlsTimeout]);



  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      reportError(createPlayerError("UNSUPPORTED", provider, { technicalCause: "action:pip" }));
    }
    resetControlsTimeout();
  }, [provider, reportError, resetControlsTimeout, videoRef]);

  // AirPlay (Safari/iOS/macOS only — capability probe, P2-39, no UA sniffing).
  const canUseAirPlay = useMemo(() => {
    if (provider === "youtube") return false;
    return getPlayerCapabilities().airplay;
  }, [provider]);

  const openAirPlayPicker = useCallback(() => {
    const video = videoRef.current as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!video?.webkitShowPlaybackTargetPicker) {
      reportError(createPlayerError("UNSUPPORTED", provider, { technicalCause: "action:airplay" }));
      return;
    }
    video.webkitShowPlaybackTargetPicker();
    resetControlsTimeout();
  }, [provider, reportError, resetControlsTimeout, videoRef]);

  // Loop commands go through the ENGINE (P1-17); the store is a display mirror.
  const toggleLoop = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;
    const loop = adapter.getLoopRange();
    const currentTime = adapter.getCurrentTime();
    if (loop === null) {
      adapter.setLoopRange(currentTime, currentTime);
      setPlaybackState({ loopStart: currentTime, loopEnd: null });
      flashFeedback({ icon: Repeat, label: "تم تحديد نقطة البداية (A)" });
    } else if (stores.playback.getState().loopEnd === null) {
      if (currentTime <= loop.start) {
        flashFeedback({ icon: Repeat, label: "يجب أن تكون النهاية بعد البداية" });
        return;
      }
      adapter.setLoopRange(loop.start, currentTime);
      setPlaybackState({ loopEnd: currentTime });
      flashFeedback({ icon: Repeat, label: "تم تفعيل التكرار (A-B)" });
    } else {
      adapter.clearLoop();
      setPlaybackState({ loopStart: null, loopEnd: null });
      flashFeedback({ icon: Repeat, label: "إيقاف التكرار" });
    }
  }, [flashFeedback, getAdapter, setPlaybackState, stores.playback]);

  const applySubtitleSelection = useCallback((subtitleId: string) => {
    if (provider === "youtube" || !videoRef.current) return;
    Array.from(videoRef.current.textTracks).forEach((track, idx) => {
      track.mode = subtitleId !== "off" && subtitleTracks[idx]?.id === subtitleId ? "showing" : "disabled";
    });
  }, [provider, subtitleTracks, videoRef]);

  const changeSubtitle = useCallback((id: string) => {
    applySubtitleSelection(id);
    setSettingsState({ selectedSubtitle: id });
    flashFeedback({
      icon: Settings2,
      label: id === "off" ? "الترجمة متوقفة" : (subtitleTracks.find(t => t.id === id)?.label ?? "ترجمة")
    });
  }, [applySubtitleSelection, flashFeedback, setSettingsState, subtitleTracks]);

  // Real audio-track selection (P1-12): HLS via the engine live effect,
  // native via AudioTrackList when exposed (Safari).
  const changeAudioTrack = useCallback((trackId: string) => {
    const hls = hlsRef.current;
    if (hls) {
      setSettingsState({ selectedAudioTrack: trackId });
      flashFeedback({ icon: Settings2, label: trackId === "auto" ? "صوت تلقائي" : "تم تغيير المسار الصوتي" });
      return;
    }
    const video = videoRef.current as (HTMLVideoElement & {
      audioTracks?: ArrayLike<{ enabled: boolean; id: string; label: string; language: string }>;
    }) | null;
    const list = video?.audioTracks;
    if (video && list && list.length > 0) {
      const idx = trackId === "auto" ? 0 : Array.from(list).findIndex(
        (t) => t.language === trackId || t.label === trackId || t.id === trackId
      );
      if (idx >= 0 && idx < list.length) {
        Array.from(list).forEach((t, i) => { t.enabled = i === idx; });
        setSettingsState({ selectedAudioTrack: trackId });
        flashFeedback({ icon: Settings2, label: trackId === "auto" ? "صوت تلقائي" : "تم تغيير المسار الصوتي" });
        return;
      }
    }
    setSettingsState({ selectedAudioTrack: trackId });
  }, [flashFeedback, hlsRef, setSettingsState, videoRef]);

  // Quality by stable KEY (P1-11); the HLS index resolves at apply time.
  const changeQuality = useCallback((qualityKey: string) => {
    const hls = hlsRef.current;
    if (hls) {
      if (qualityKey === AUTO_QUALITY_KEY) {
        hls.currentLevel = -1;
      } else {
        const match = stores.settings.getState().qualities.find((q) => q.key === qualityKey);
        if (!match) return;
        hls.currentLevel = match.levelIndex;
      }
      setSettingsState({ selectedQualityKey: qualityKey });
      flashFeedback({
        icon: Settings2,
        label: qualityKey === AUTO_QUALITY_KEY ? `تلقائي` : `جودة ${qualityKey}`
      });
      return;
    }
    const source = qualitySources.find(q => String(q.id) === qualityKey);
    if (!source) return;
    pendingSourceSwitchRef.current = {
      time: getAdapter()?.getCurrentTime() ?? 0,
      shouldResume: isPlaying
    };
    setSettingsState({ selectedQualityKey: qualityKey });
    setQualityOverride({ forVideoUrl: videoUrl, src: source.src });
    setPlaybackState({ isLoading: true });
    flashFeedback({ icon: Settings2, label: source.label });
  }, [flashFeedback, getAdapter, hlsRef, isPlaying, pendingSourceSwitchRef, qualitySources, setPlaybackState, setQualityOverride, setSettingsState, stores.settings, videoUrl]);

  return {
    handleSeek,
    seekBy,
    togglePlayPause,
    toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    beginTemporaryRate,
    endTemporaryRate,
    toggleFullscreen,
    togglePip,
    canUseAirPlay,
    openAirPlayPicker,
    toggleLoop,
    changeSubtitle,
    changeAudioTrack,
    changeQuality,
  };
}
