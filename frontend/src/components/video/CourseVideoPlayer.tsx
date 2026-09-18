'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Repeat,
  HelpCircle,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Extracted sub-components
import { AnimatedWatermark } from "@/app/(education)/courses/components/_components/AnimatedWatermark";
import { SidebarHint } from "@/app/(education)/courses/components/_components/SidebarHint";

import {
  AUTO_QUALITY_KEY,
  AUTOPLAY_NEXT_SECONDS,
  CONTROLS_HIDE_TIMEOUT_MS,
  PLAYER_PREFERENCES_KEY,
  PLAYBACK_RATES,
  WATERMARK_POSITIONS,
} from "./player/constants";

// Components
import { PlayerControls } from "./player/components/PlayerControls";
import { PlayerHeader } from "./player/components/PlayerHeader";
import { PlayerOverlays } from "./player/components/PlayerOverlays";
import { PlayerPanels } from "./player/components/PlayerPanels";
import { AmbientBackground } from "./player/components/AmbientBackground";
import { GestureOverlay } from "./player/components/GestureOverlay";
import { SkipIntroButton } from "./player/components/SkipIntroButton";
import { SuspendedInteractiveQuestionOverlay } from "./player/components/LazyComponents";
import { ActiveNotePopup } from "./player/components/ActiveNotePopup";

// Hooks
import { useYouTubePlayer } from "./player/hooks/useYouTubePlayer";
import { useKeyboardShortcuts } from "./player/hooks/useKeyboardShortcuts";
import { useTouchGestures } from "./player/hooks/useTouchGestures";
import { useProgressPersistence } from "./player/hooks/useProgressPersistence";
import { useHlsEngine } from "./player/hooks/useHlsEngine";
import { usePlayerAdapter } from "./player/hooks/usePlayerAdapter";
import { useTimelineNotes } from "./player/hooks/useTimelineNotes";
import { useFrameCapture } from "./player/hooks/useFrameCapture";
import { useMediaSession } from "./player/hooks/useMediaSession";
import { useCastSession } from "./player/hooks/useCastSession";
import { useTranscript } from "./player/hooks/useTranscript";
import { usePlayerWatermark } from "./player/hooks/usePlayerWatermark";
import { useThumbnailCues } from "./player/hooks/useThumbnailCues";
import { useMiniPlayer } from "./player/hooks/useMiniPlayer";
import { usePlayerViewport } from "./player/hooks/usePlayerViewport";

// Store & Types
import { usePlaybackStore } from "./player/stores/playback-store";
import {
  PlayerScopeProvider,
  createPlayerScope,
  usePlayerPlayback,
  usePlayerUI,
  usePlayerSettings,
  usePlayerStores,
} from "./player/stores/player-scope";
import { newQuestionAttemptId } from "@/lib/lesson-questions";
import { useInteractiveQuestions } from "./player/hooks/useInteractiveQuestions";
import type {
  CourseVideoPlayerProps,
  PlayerFeedback,
  YouTubeRuntimePlayer,
} from "./player/types";

export type { CourseVideoPlayerApi } from "./player/types";

// Utils
import {
  clamp,
  formatSecondsToTimestamp,
  getProvider,
  mapYouTubeErrorCode,
  mergeChapterMarkers,
  parseYouTubeId,
  playerErrorMessage,
  readPlayerPreferences,
  shouldUseHls,
} from "./player/utils";

export function CourseVideoPlayer(props: CourseVideoPlayerProps) {
  // P0 FIX (player-scoped state): every player instance gets isolated
  // playback / UI / settings stores so two players on one page never share
  // currentTime, volume, isPlaying, sidebar, settings or watch time.
  // The scope is keyed by course+lesson and created once per mount.
  const scope = useMemo(
    () => createPlayerScope(props.courseId, props.lessonId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- new lesson = new identity via key/remount contract
    [props.courseId, props.lessonId]
  );
  return (
    <PlayerScopeProvider
      courseId={props.courseId}
      lessonId={props.lessonId}
      scope={scope}
    >
      <CourseVideoPlayerInner {...props} />
    </PlayerScopeProvider>
  );
}

function CourseVideoPlayerInner({
  courseId,
  lessonId,
  lessonTitle,
  videoUrl,
  provider: explicitProvider,
  alreadyCompleted = false,
  onLessonAutoComplete,
  onNextVideo,
  playerApiRef,
  className,
  watermarkText = "Thanawy Academy",
  bookmarks = [],
  chapterMarkers = [],
  isTheaterMode = false,
  onToggleTheater,
  audioTracks = [],
  subtitleTracks = [],
  lessons = [],
  onLessonChange,
  thumbnailVttUrl,
  qualitySources = [],
  interactiveQuestions = [],
  disableServerQuestions = false,
  onProgress,
}: CourseVideoPlayerProps) {
  // --- Refs & Internal State ---
  // Quality switches (non-HLS) temporarily override the URL. The override is tagged with the
  // `videoUrl` it was created for, so a URL change coming from the parent (lesson switch)
  // automatically invalidates it — no reset effect and no ref access during render.
  const [qualityOverride, setQualityOverride] = useState<{ forVideoUrl: string; src: string } | null>(null);
  const activeVideoUrl = qualityOverride?.forVideoUrl === videoUrl ? qualityOverride.src : videoUrl;
  // P1-10: explicit backend metadata wins; hostname-based detection is the fallback.
  const detectedProvider = useMemo(() => getProvider(activeVideoUrl), [activeVideoUrl]);
  const provider = explicitProvider ?? detectedProvider;
  const youtubeId = useMemo(() => parseYouTubeId(activeVideoUrl), [activeVideoUrl]);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRuntimeRef = useRef<YouTubeRuntimePlayer | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const runPlaybackLoopRef = useRef<() => void>(() => undefined);
  const pendingSourceSwitchRef = useRef<{ time: number; shouldResume: boolean } | null>(null);
  const lastCheckedSecondRef = useRef<number>(-1);
  // Fresh server-validation attempt identity per presented question.
  const [questionAttemptId, setQuestionAttemptId] = useState<string>("");

  // Server-first questions: the stripped server list (no answer key) wins
  // whenever it loads; embedded props are sanitized and stay as fallback.
  const { questions: effectiveQuestions } = useInteractiveQuestions({
    lessonId,
    initialQuestions: interactiveQuestions,
    disabled: disableServerQuestions,
  });

  const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([]);

  // Stores State selection (scoped to this player instance)
  const stores = usePlayerStores();
  const setPlaybackState = usePlayerPlayback((s) => s.setPlaybackState);
  const setUIState = usePlayerUI((s) => s.setUIState);
  const setSettingsState = usePlayerSettings((s) => s.setSettingsState);

  const playbackStore = usePlayerPlayback(useShallow((s) => ({
    volume: s.volume,
    isMuted: s.isMuted,
    playbackRate: s.playbackRate,
    isPlaying: s.isPlaying,
    autoplayCountdown: s.autoplayCountdown,
    isEnded: s.isEnded,
    resumeTime: s.resumeTime,
    activeQuestionId: s.activeQuestionId,
    answeredQuestionIds: s.answeredQuestionIds,
  })));

  const uiStore = usePlayerUI(useShallow((s) => ({
    isFullscreen: s.isFullscreen,
    isMiniPlayer: s.isMiniPlayer,
    sidebarTab: s.sidebarTab,
    isSidebarOpen: s.isSidebarOpen,
    showControls: s.showControls,
    errorMessage: s.errorMessage,
    isSettingsOpen: s.isSettingsOpen,
    isHelpOpen: s.isHelpOpen,
    isStatsOpen: s.isStatsOpen,
    isShortcutsOpen: s.isShortcutsOpen,
  })));

  const settingsStore = usePlayerSettings(useShallow((s) => ({
    isAmbientMode: s.isAmbientMode,
    brightness: s.brightness,
    watermarkIndex: s.watermarkIndex,
    selectedSubtitle: s.selectedSubtitle,
    selectedAudioTrack: s.selectedAudioTrack,
    hlsAudioTracks: s.hlsAudioTracks,
    subtitleSize: s.subtitleSize,
    subtitleBgOpacity: s.subtitleBgOpacity,
    zoomFactor: s.zoomFactor,
    panOffset: s.panOffset,
    qualities: s.qualities,
  })));

  // Combine into a single local `store` object to keep the rest of the code intact
  const store = useMemo(() => ({
    ...playbackStore,
    ...uiStore,
    ...settingsStore,
  }), [playbackStore, uiStore, settingsStore]);
  
  // Helper to set feedback using UI store
  const setFeedback = useCallback((feedback: PlayerFeedback | null) => {
    setUIState({ feedback });
  }, [setUIState]);

// --- Helpers ---
  const flashFeedback = useCallback((feedback: PlayerFeedback) => {
    setFeedback(feedback);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => setFeedback(null), 850);
  }, [setFeedback]);

  const resetControlsTimeout = useCallback(() => {
    setUIState({ showControls: true });
    if (playerContainerRef.current) playerContainerRef.current.style.cursor = "default";
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = window.setTimeout(() => {
      const isPlaying = stores.playback.getState().isPlaying;
      const { isSettingsOpen, isSidebarOpen, isHelpOpen, isStatsOpen } = stores.ui.getState();
      if (isPlaying && !isSettingsOpen && !isSidebarOpen && !isHelpOpen && !isStatsOpen) {
        setUIState({ showControls: false });
        if (playerContainerRef.current) playerContainerRef.current.style.cursor = "none";
      }
    }, CONTROLS_HIDE_TIMEOUT_MS);
  }, [setUIState]);

  // --- Hook: Player Adapter ---
  const getAdapter = usePlayerAdapter({ provider, videoRef, youtubePlayerRuntimeRef });

  // --- Hook: Timeline Notes ---
  const {
    notes,
    noteDraft,
    setNoteDraft,
    isNotesSyncing,
    addNoteAtCurrentTime,
    removeNote,
  } = useTimelineNotes({ lessonId, flashFeedback });

  const { hasTranscript, cues: transcriptCues, query: transcriptQuery, setQuery: setTranscriptQuery } = useTranscript({ lessonId });

  // --- Hook: Progress & Persistence ---
  const storageKey = useMemo(() => `course-video-progress:${courseId}:${lessonId}`, [courseId, lessonId]);
  const { saveProgress, loadResumeData } = useProgressPersistence({
    lessonId,
    storageKey,
    getDuration: () => getAdapter()?.getDuration() ?? 0,
    getCurrentTime: () => getAdapter()?.getCurrentTime() ?? 0,
    triggerAutoComplete: () => onLessonAutoComplete?.(lessonId),
    alreadyCompleted,
  });

  // --- Content Deterrence (NOT real security) ---
  // P0 FIX: the previous implementation treated blur / PrintScreen /
  // window-resize heuristics as a security boundary and showed a blocking
  // overlay + wiped the user's clipboard. None of that stops real capture
  // (screen recorders, browser capture, external hardware) while punishing
  // legitimate users (Alt-Tab fires blur; multi-monitor/tablet setups trip
  // the outerWidth heuristic; clipboard wiping needs permission and fails).
  //
  // Real content security must live server-side: signed short-lived URLs,
  // authenticated manifests / segment authorization, per-user watermarking,
  // and DRM where the content value justifies it. What remains here is
  // passive deterrence only: no clipboard access, no blocking overlay from
  // heuristics — just a watermark pulse + optional parent callback.
  const [deterrencePulse, setDeterrencePulse] = useState(false);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    // PrintScreen deterrence: pulse the watermark instead of touching the
    // clipboard. Listener stays global — PrintScreen targets the OS, not the
    // player element — but the reaction is cosmetic only.
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setDeterrencePulse(true);
        setSettingsState((s) => ({
          watermarkIndex: (s.watermarkIndex + 1) % WATERMARK_POSITIONS.length,
        }));
        window.setTimeout(() => setDeterrencePulse(false), 3000);
      }
    };

    // NOTE: intentionally no window blur / focus / resize (DevTools-size
    // heuristic) handlers. They cannot distinguish capture tools from normal
    // use and previously locked genuine students out of playback.
    //
    // Scoped contextmenu suppression stays: it only blocks the native video
    // element menu (which exposes "Save video"), never the player's own UI.
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isVideoElement = target.tagName === 'VIDEO';
      const isYouTubeEmbed = !!target.closest('[data-youtube-container]');
      if (isVideoElement || isYouTubeEmbed) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('dragstart', handleDragStart);
    };
  }, [setSettingsState]);

  // --- Zoom, Pan & Mini-player ---
  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePlayerViewport();

  const handleDoubleClick = useCallback(() => {
    const storeState = stores.settings.getState();
    if (storeState.zoomFactor > 1) {
      setSettingsState({ zoomFactor: 1, panOffset: { x: 0, y: 0 } });
      flashFeedback({ icon: Sparkles, label: "إعادة ضبط الحجم" });
    } else {
      setSettingsState({ zoomFactor: 2, panOffset: { x: 0, y: 0 } });
      flashFeedback({ icon: Sparkles, label: "تكبير 2x" });
    }
  }, [flashFeedback, setSettingsState]);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const storeState = stores.settings.getState();
        const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
        const nextZoom = clamp(storeState.zoomFactor + zoomDelta, 1, 3);
        const nextPan = nextZoom === 1 ? { x: 0, y: 0 } : storeState.panOffset;
        setSettingsState({ zoomFactor: nextZoom, panOffset: nextPan });
        flashFeedback({ icon: Sparkles, label: `تكبير ${nextZoom.toFixed(1)}x` });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [flashFeedback, setSettingsState]);

  const dynamicWatermark = usePlayerWatermark(watermarkText);
  const thumbnailCues = useThumbnailCues(thumbnailVttUrl);
  useMiniPlayer(playerContainerRef);

  // --- Hook: HLS Engine ---
  const hlsRef = useHlsEngine({ activeVideoUrl, provider, videoRef, flashFeedback });

  // --- Hook: Frame Capture ---
  const captureFrame = useFrameCapture({ videoRef, provider, flashFeedback, lessonTitle });

  // --- Playback Loop Management ---
  // P0 PERF FIX: the rAF loop reads the media element every frame (cheap,
  // realtime engine state stays in the DOM node / local vars), but React /
  // Zustand UI state is pushed at most ~4Hz (or when duration/buffered
  // actually change). Previously setPlaybackState ran ~60x/sec and every
  // currentTime subscriber (controls, header, rail, popups, panels)
  // re-rendered on each frame. Server progress stays on its own 4s+
  // cadence inside saveProgress() — never per frame.
  const lastPushedTimeRef = useRef<number>(-1);
  const lastPushedDurationRef = useRef<number>(-1);
  const lastPushedBufferedRef = useRef<number>(-1);
  const lastProgressCbAtRef = useRef<number>(0);
  const syncPlaybackSnapshot = useCallback((force = false) => {
    const adapter = getAdapter();
    if (!adapter) return;

    // Realtime engine state — local only, no React traffic.
    const nextTime = adapter.getCurrentTime();
    const duration = adapter.getDuration();
    const buffered = adapter.getBuffered();

    const { activeQuestionId, answeredQuestionIds } = stores.playback.getState();
    
    // Interactive Questions Detection
    // FIX: `lastCheckedSecondRef` used to be advanced only when a question was
    // found, so on every second with no match `.find()` re-ran on every single
    // animation frame (≈60x/sec) for the whole interactiveQuestions array
    // until a match appeared. Advancing it unconditionally caps this lookup
    // to once per second regardless of outcome.
    const currentSecond = Math.floor(nextTime);
    if (effectiveQuestions.length > 0 && !activeQuestionId && currentSecond !== lastCheckedSecondRef.current) {
      lastCheckedSecondRef.current = currentSecond;
      const question = effectiveQuestions.find(q =>
        Math.abs((q.timePosition ?? q.time ?? 0) - nextTime) < 0.8 && !answeredQuestionIds.includes(q.id)
      );
      if (question) {
        adapter.pause();
        setQuestionAttemptId(newQuestionAttemptId());
        setPlaybackState({ activeQuestionId: question.id });
        setPlaybackState({ isPlaying: false });
        setUIState({ showControls: true });
        flashFeedback({ icon: HelpCircle, label: "سؤال تفاعلي" });
        return; // Stop sync until answered
      }
    }

    // P1-17: loop enforcement reads the ENGINE-owned range (adapter), never
    // the store mirror. Per-frame check = boundary precision for all providers.
    // A pending range (end <= start, "A set, waiting for B") never enforces.
    const loop = adapter.getLoopRange();
    if (loop !== null && loop.end > loop.start && nextTime >= loop.end) {
      adapter.seekTo(loop.start);
      lastPushedTimeRef.current = loop.start;
      setPlaybackState({ currentTime: loop.start });
    } else {
      // Throttled UI push: time moves 4Hz, duration/buffered only on change.
      const timeDelta = Math.abs(nextTime - lastPushedTimeRef.current);
      const durationChanged = duration !== lastPushedDurationRef.current;
      const bufferedChanged = Math.abs(buffered - lastPushedBufferedRef.current) > 0.5;
      if (force || timeDelta >= 0.25 || durationChanged || bufferedChanged) {
        lastPushedTimeRef.current = nextTime;
        lastPushedDurationRef.current = duration;
        lastPushedBufferedRef.current = buffered;
        setPlaybackState({
          currentTime: nextTime,
          duration,
          buffered,
        });
      }
    }

    // Parent onProgress callback throttled to 4Hz (was: every frame).
    if (onProgress) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (force || now - lastProgressCbAtRef.current >= 250) {
        lastProgressCbAtRef.current = now;
        onProgress(nextTime, duration);
      }
    }
  }, [getAdapter, effectiveQuestions, flashFeedback, onProgress, setPlaybackState, setUIState]);

  const stopPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const runPlaybackLoop = useCallback(() => {
    syncPlaybackSnapshot();
    saveProgress();
    if (stores.playback.getState().isPlaying) {
      animationFrameRef.current = window.requestAnimationFrame(() => runPlaybackLoopRef.current());
    } else {
      animationFrameRef.current = null;
    }
  }, [saveProgress, syncPlaybackSnapshot]);

  useEffect(() => {
    runPlaybackLoopRef.current = runPlaybackLoop;
  }, [runPlaybackLoop]);

  const startPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = window.requestAnimationFrame(() => runPlaybackLoopRef.current());
    }
  }, []);

  // --- Core Player Actions ---
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
  }, [getAdapter, resetControlsTimeout, setPlaybackState, syncPlaybackSnapshot]);

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
      setUIState({ errorMessage: "تعذر تشغيل الفيديو الحالي." });
    }
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setUIState]);

  const toggleMute = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;
    const nextMuted = !store.isMuted;
    adapter.setMuted(nextMuted);
    if (!nextMuted && store.volume === 0) {
      adapter.setVolume(0.5);
      setPlaybackState({ volume: 0.5 });
    }
    setPlaybackState({ isMuted: nextMuted });
    flashFeedback({ icon: nextMuted ? VolumeX : Volume2, label: nextMuted ? "كتم" : "صوت" });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setPlaybackState, store.isMuted, store.volume]);

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
    adapter.setPlaybackRate(nextRate);
    setPlaybackState({ playbackRate: nextRate });
    flashFeedback({ icon: Settings2, label: `${nextRate}x` });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, provider, resetControlsTimeout, setPlaybackState, youtubePlaybackRates]);

  // --- Temporary speed gesture as a PLAYER COMMAND (P1-8) ---
  // Long-press 2x must drive the adapter AND the store together. A bare
  // store mutation fakes the badge while the media element keeps its old
  // rate — the exact UI/real-state divergence this guards against.
  const tempRateRef = useRef<number | null>(null);
  const beginTemporaryRate = useCallback((rate: number) => {
    if (tempRateRef.current !== null) return true;
    const adapter = getAdapter();
    if (!adapter) return false;
    if (provider === "youtube" && !youtubePlaybackRates.includes(rate)) return false;
    tempRateRef.current = stores.playback.getState().playbackRate;
    adapter.setPlaybackRate(rate);
    setPlaybackState({ playbackRate: rate });
    return true;
  }, [getAdapter, provider, setPlaybackState, stores.playback, youtubePlaybackRates]);

  const endTemporaryRate = useCallback(() => {
    const previous = tempRateRef.current;
    if (previous === null) return;
    tempRateRef.current = null;
    getAdapter()?.setPlaybackRate(previous);
    setPlaybackState({ playbackRate: previous });
  }, [getAdapter, setPlaybackState]);

  // Expose the declared imperative API to the parent. Previously this prop
  // was renamed to `_playerApiRef` and silently ignored, leaving external
  // play/pause/seek controls disconnected from the real player.
  useEffect(() => {
    if (!playerApiRef) return;
    playerApiRef.current = {
      play: () => { void getAdapter()?.play(); },
      pause: () => getAdapter()?.pause(),
      seek: (time) => getAdapter()?.seekTo(time),
      getCurrentTime: () => getAdapter()?.getCurrentTime() ?? 0,
      getDuration: () => getAdapter()?.getDuration() ?? 0,
      setPlaybackRate: (rate) => getAdapter()?.setPlaybackRate(rate),
    };
    return () => {
      if (playerApiRef.current) playerApiRef.current = null;
    };
  }, [getAdapter, playerApiRef]);

  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      setUIState({ errorMessage: "تعذر تفعيل وضع ملء الشاشة." });
    }
    resetControlsTimeout();
  }, [resetControlsTimeout, setUIState]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      setUIState({ errorMessage: "وضع النافذة العائمة غير متاح لهذا المتصفح." });
    }
    resetControlsTimeout();
  }, [provider, resetControlsTimeout, setUIState]);

  // AirPlay (Safari/iOS/macOS only — WebKit exposes this non-standard method
  // on the media element; other browsers simply don't have it, so we guard).
  const canUseAirPlay = useMemo(() => {
    if (typeof window === "undefined" || provider === "youtube") return false;
    return typeof (window as { WebKitPlaybackTargetAvailabilityEvent?: unknown }).WebKitPlaybackTargetAvailabilityEvent !== "undefined";
  }, [provider]);

  const openAirPlayPicker = useCallback(() => {
    const video = videoRef.current as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!video?.webkitShowPlaybackTargetPicker) {
      setUIState({ errorMessage: "AirPlay غير متاح على هذا المتصفح." });
      return;
    }
    video.webkitShowPlaybackTargetPicker();
    resetControlsTimeout();
  }, [resetControlsTimeout, setUIState]);

  // P1-17: loop commands go through the ENGINE (adapter owns the range);
  // the store keeps a display mirror for the button + timeline region.
  const toggleLoop = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;
    const loop = adapter.getLoopRange();
    const currentTime = adapter.getCurrentTime();
    if (loop === null) {
      adapter.setLoopRange(currentTime, currentTime);
      // A zero-length range marks "A set, waiting for B" — enforcement is a
      // no-op until B lands past A (end > start guard in setLoopRange).
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
  }, [provider, subtitleTracks]);

  const changeSubtitle = useCallback((id: string) => {
    applySubtitleSelection(id);
    setSettingsState({ selectedSubtitle: id });
    flashFeedback({
      icon: Settings2,
      label: id === "off" ? "الترجمة متوقفة" : (subtitleTracks.find(t => t.id === id)?.label ?? "ترجمة")
    });
  }, [applySubtitleSelection, flashFeedback, setSettingsState, subtitleTracks]);

  // P1-12: real audio-track selection. HLS switches via the engine (the
  // useHlsEngine live effect applies the stored id); native/HTML5 switches
  // via the media element's AudioTrackList when exposed (Safari). The store
  // stays the single source of truth either way.
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
    // No switchable tracks on this element — keep the choice stored so an
    // HLS manifest carrying it later can still apply it.
    setSettingsState({ selectedAudioTrack: trackId });
  }, [flashFeedback, hlsRef, setSettingsState]);

  // P1-11: quality is selected by stable KEY. The HLS level index is
  // resolved at apply time from the current manifest — never stored.
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
    // Progressive (non-HLS) sources carry backend-provided numeric ids;
    // they are explicit source identities, matched here by string form.
    const source = qualitySources.find(q => String(q.id) === qualityKey);
    if (!source) return;
    pendingSourceSwitchRef.current = {
      time: getAdapter()?.getCurrentTime() ?? 0,
      shouldResume: store.isPlaying
    };
    setSettingsState({ selectedQualityKey: qualityKey });
    setQualityOverride({ forVideoUrl: videoUrl, src: source.src });
    setPlaybackState({ isLoading: true });
    flashFeedback({ icon: Settings2, label: source.label });
  }, [flashFeedback, getAdapter, hlsRef, qualitySources, setPlaybackState, setSettingsState, store.isPlaying, stores.settings, videoUrl]);

  // --- Hook Integration: Keyboard & Touch ---
  const handleKeyboardShortcuts = useKeyboardShortcuts({
    togglePlayPause, seekBy, handleSeek, handleVolumeChange, handlePlaybackRateChange: handlePlaybackRateChange,
    toggleMute, toggleFullscreen, togglePip,
    onToggleTheater, changeSubtitle, toggleLoop, setOpenPanel: (p) => setUIState({
      isSettingsOpen: p === "settings", isHelpOpen: p === "help", isStatsOpen: p === "stats", isSidebarOpen: p === "sidebar"
    }),
    getDuration: () => getAdapter()?.getDuration() ?? 0,
    subtitleTracks, selectedSubtitle: store.selectedSubtitle
  });

  const {
    handleSurfaceTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    gestureActiveMode,
    gestureValue,
  } = useTouchGestures({
    togglePlayPause, seekBy, handleVolumeChange, resetControlsTimeout,
    beginTemporaryRate, endTemporaryRate,
  });

  // --- Hook: MediaSession API (OS-level media controls) ---
  useMediaSession({
    title: lessonTitle,
    enabled: provider !== "youtube",
    isPlaying: store.isPlaying,
    onPlay: () => getAdapter()?.play(),
    onPause: () => getAdapter()?.pause(),
    onSeekForward: () => seekBy(10),
    onSeekBackward: () => seekBy(-10),
    onNextTrack: onNextVideo,
  });

  const { canCast, isCasting, startCasting, stopCasting } = useCastSession({
    videoUrl: activeVideoUrl,
    title: lessonTitle,
    getCurrentTime: () => getAdapter()?.getCurrentTime() ?? 0,
    // P1-13: once the receiver takes over, local playback stops so the two
    // don't double-play. Reconnect/resume stays user-driven via the player.
    onStarted: () => getAdapter()?.pause(),
  });
  const toggleCasting = useCallback(() => {
    if (isCasting) stopCasting();
    else startCasting();
  }, [isCasting, startCasting, stopCasting]);

  // --- Sync & Lifecycle Effects ---
  // FIX: The old `useEffect(() => setActiveVideoUrl(videoUrl), [videoUrl])` caused a classic
  // derived-state double render cycle. `activeVideoUrl` is now computed directly from the prop,
  // and the quality override state is tagged with the `videoUrl` it applies to, so switching
  // lessons invalidates any stale override automatically — no reset effect needed.

  useEffect(() => {
    // FIX (Hydration): readPlayerPreferences() is now called inside useEffect only.
    // Previously it was in useMemo which executes during the render phase — the server
    // returns DEFAULT_PLAYER_PREFERENCES (no localStorage) while the browser returns the
    // student's real preferences, causing a Hydration value mismatch and a flash of
    // incorrect player state. useEffect is guaranteed to run only in the browser after
    // hydration is complete, making this read 100% safe and isomorphic.
    const prefs = readPlayerPreferences();
    const resetPlaybackState = stores.playback.getState().resetPlaybackState;
    const resetUIState = stores.ui.getState().resetUIState;
    const resetSettingsState = stores.settings.getState().resetSettingsState;

    resetPlaybackState({
      isLoading: true,
      volume: prefs.volume,
      isMuted: prefs.isMuted,
      playbackRate: prefs.playbackRate,
    });
    resetUIState({
      isSidebarOpen: prefs.isSidebarOpen ?? false,
      sidebarTab: prefs.sidebarTab ?? "bookmarks",
    });
    resetSettingsState({
      isAmbientMode: prefs.isAmbientMode,
      selectedSubtitle: prefs.selectedSubtitle,
      selectedAudioTrack: prefs.selectedAudioTrack ?? "auto",
      brightness: prefs.brightness,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset cached YouTube rates when the lesson changes
    setYoutubePlaybackRates([]);
    setNoteDraft("");
  }, [lessonId, setNoteDraft]);

  useEffect(() => {
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify({
      volume: store.volume,
      isMuted: store.isMuted,
      playbackRate: store.playbackRate,
      isAmbientMode: store.isAmbientMode,
      selectedSubtitle: store.selectedSubtitle,
      selectedAudioTrack: store.selectedAudioTrack,
      brightness: store.brightness,
      isSidebarOpen: store.isSidebarOpen,
      sidebarTab: store.sidebarTab,
    }));
  }, [store.brightness, store.isAmbientMode, store.isMuted, store.playbackRate, store.selectedSubtitle, store.selectedAudioTrack, store.volume, store.isSidebarOpen, store.sidebarTab]);

  useEffect(() => {
    const onFullscreen = () => setUIState({ isFullscreen: !!document.fullscreenElement });
    const onPip = () => setUIState({ isPip: !!document.pictureInPictureElement });
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("enterpictureinpicture", onPip);
    document.addEventListener("leavepictureinpicture", onPip);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("enterpictureinpicture", onPip);
      document.removeEventListener("leavepictureinpicture", onPip);
    };
  }, [setUIState]);

  // Only rotate the watermark while the video is actually playing — no point
  // ticking this timer while paused or before playback has started.
  useEffect(() => {
    if (!store.isPlaying) return;
    const interval = setInterval(() => {
      setSettingsState((s) => ({ watermarkIndex: (s.watermarkIndex + 1) % WATERMARK_POSITIONS.length }));
    }, 12000);
    return () => clearInterval(interval);
  }, [setSettingsState, store.isPlaying]);

  // Video Element Events
  useEffect(() => {
    const v = videoRef.current;
    if (!v || provider === "youtube") return;

    const onLoaded = () => {
      setPlaybackState({ isLoading: false, duration: v.duration });
      if (pendingSourceSwitchRef.current) {
        const p = pendingSourceSwitchRef.current;
        pendingSourceSwitchRef.current = null;
        v.currentTime = p.time;
        if (p.shouldResume) v.play();
      } else {
        loadResumeData();
      }
    };
    const onPlay = () => { setPlaybackState({ isPlaying: true, isEnded: false }); startPlaybackLoop(); };
    const onPause = () => { setPlaybackState({ isPlaying: false }); stopPlaybackLoop(); saveProgress(true); };
    const onEnded = () => {
      setPlaybackState({ isPlaying: false, isEnded: true, autoplayCountdown: AUTOPLAY_NEXT_SECONDS });
      saveProgress(true);
    };

    const onWaiting = () => setPlaybackState({ isLoading: true });
    const onPlaying = () => setPlaybackState({ isLoading: false });

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
    };
  }, [loadResumeData, provider, saveProgress, setPlaybackState, startPlaybackLoop, stopPlaybackLoop]);

  // YouTube Hook Integration
  useYouTubePlayer({
    containerRef: youtubeContainerRef,
    enabled: provider === "youtube" && !!youtubeId,
    videoId: youtubeId,
    volume: store.volume,
    isMuted: store.isMuted,
    playbackRate: store.playbackRate,
    playerRef: youtubePlayerRuntimeRef,
    onReady: (p) => {
      setPlaybackState({ isLoading: false, duration: p.getDuration() });
      setYoutubePlaybackRates(p.getAvailablePlaybackRates?.() ?? []);
      loadResumeData();
    },
    onStateChange: (state, player, api) => {
      if (state === api.PlayerState.PLAYING) { setPlaybackState({ isPlaying: true, isEnded: false }); startPlaybackLoop(); }
      else if (state === api.PlayerState.PAUSED) { setPlaybackState({ isPlaying: false }); stopPlaybackLoop(); saveProgress(true); }
      else if (state === api.PlayerState.ENDED) {
        setPlaybackState({ isPlaying: false, isEnded: true, autoplayCountdown: AUTOPLAY_NEXT_SECONDS });
        saveProgress(true);
      }
    },
    // P1-9: YouTube failures now reach the unified error surface with a
    // mapped code. `undefined` = SDK failed to load (offline/blocked) → NETWORK.
    onError: (code) => {
      const error = code === undefined
        ? { code: "NETWORK" as const, provider: "youtube" as const, retryable: true }
        : mapYouTubeErrorCode(code);
      setUIState({ errorMessage: playerErrorMessage(error) });
      setPlaybackState({ isLoading: false, isPlaying: false });
      stopPlaybackLoop();
    }
  });

  // Autoplay Effect
  useEffect(() => {
    if (!store.isEnded || !onNextVideo) return;
    if (store.autoplayCountdown <= 0) { onNextVideo(); return; }
    const t = setTimeout(() => setPlaybackState(s => ({ autoplayCountdown: s.autoplayCountdown - 1 })), 1000);
    return () => clearTimeout(t);
  }, [onNextVideo, setPlaybackState, store.autoplayCountdown, store.isEnded]);

  // Watch Time Tracking Effect
  // FIX: Subscribe to `playbackStore.isPlaying` directly instead of `store.isPlaying` (merged object).
  // The merged `store` object re-creates on any change in all 3 stores, which would restart the
  // interval unnecessarily. `playbackStore.isPlaying` is a stable, granular subscription.
  useEffect(() => {
    let intervalId: number | null = null;
    if (playbackStore.isPlaying) {
      intervalId = window.setInterval(() => {
        stores.settings.getState().incrementWatchSeconds(1);
      }, 1000);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [playbackStore.isPlaying, stores.settings]);

  // App-level bridge: use-unified-time-coordinator (mounted once at layout
  // level, outside this provider) still reads the legacy global playback
  // store. Mirror ONLY the isPlaying transition — never currentTime or other
  // high-frequency state — so Pomodoro suspension keeps working with N
  // scoped players (any-playing semantics) without reintroducing sharing.
  useEffect(() => {
    usePlaybackStore.getState().setPlaybackState({ isPlaying: playbackStore.isPlaying });
  }, [playbackStore.isPlaying]);

  // --- Computed Values ---
  const mergedMarkers = useMemo(() => mergeChapterMarkers(bookmarks, chapterMarkers), [bookmarks, chapterMarkers]);
  const sidebarHasContent = mergedMarkers.length > 0 || notes.length > 0 || lessons.length > 0;
  const subtitleSizeMap = {
    sm: "14px",
    md: "18px",
    lg: "22px",
    xl: "26px"
  };
  const cueFontSize = subtitleSizeMap[store.subtitleSize || "md"];
  const cueBgColor = `rgba(0, 0, 0, ${store.subtitleBgOpacity ?? 0.75})`;
  const playbackRates = provider === "youtube" && youtubePlaybackRates.length > 0
    ? [...new Set([...youtubePlaybackRates, ...PLAYBACK_RATES])].sort((a, b) => a - b)
    : PLAYBACK_RATES;
  // P1-12: backend-provided tracks win; otherwise the HLS-discovered list.
  const effectiveAudioTracks = useMemo(
    () => (audioTracks.length > 0 ? audioTracks : store.hlsAudioTracks),
    [audioTracks, store.hlsAudioTracks]
  );

  // --- Render ---
  return (
    <div
      ref={playerContainerRef}
      dir="rtl"
      tabIndex={0}
      onKeyDown={handleKeyboardShortcuts}
      onMouseMove={resetControlsTimeout}
      onMouseDown={() => playerContainerRef.current?.focus()}
      className={cn(
        "group/player relative aspect-video w-full max-h-[70vh] md:max-h-[75vh] lg:max-h-[80vh] select-none overflow-hidden rounded-[28px] border border-white/10 bg-[#030712] text-white shadow-[0_28px_90px_rgba(2,6,23,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        store.isFullscreen && "rounded-none max-h-none",
        store.isMiniPlayer && "fixed bottom-4 right-4 z-50 w-[340px] h-auto aspect-video max-h-none rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 animate-in fade-in slide-in-from-bottom-4",
        className
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .group\\/player video::cue {
          font-size: ${cueFontSize} !important;
          background: ${cueBgColor} !important;
          background-color: ${cueBgColor} !important;
        }
      `}} />

      {store.isMiniPlayer && (
        <>
          {/* P1-14: drag handle for the floating player (see useMiniPlayer). */}
          <div
            data-minidrag
            className="absolute top-0 right-0 left-12 z-50 h-10 cursor-move touch-none"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => {
              getAdapter()?.pause();
              // P1-14: explicit dismiss sticks until the player scrolls back
              // into view — the observer must not re-trigger it.
              setUIState({ isMiniPlayer: false, miniPlayerDismissed: true });
            }}
            className="absolute top-3 right-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-105 transition active:scale-95"
            aria-label="إغلاق الفيديو المصغر"
          >
            ✕
          </button>
        </>
      )}

      {/* Passive capture deterrence: the per-user watermark pulses briefly
          on PrintScreen instead of blocking playback or touching the
          clipboard. Never a security boundary — see note above. */}
      {deterrencePulse && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[60] border-2 border-red-500/40"
        />
      )}

      <AmbientBackground videoRef={videoRef} provider={provider} />
      <GestureOverlay mode={gestureActiveMode} value={gestureValue} visible={!!gestureActiveMode} />
      {!store.isMiniPlayer && <SkipIntroButton markers={mergedMarkers} onSkip={handleSeek} />}

      <div 
        className="absolute inset-0 select-none transition-transform duration-75 ease-out" 
        style={{ 
          filter: `brightness(${store.brightness})`,
          transform: `scale(${store.zoomFactor}) translate(${store.panOffset.x / store.zoomFactor}px, ${store.panOffset.y / store.zoomFactor}px)`,
        }}
      >
        {provider === "youtube" ? (
          <div ref={youtubeContainerRef} data-youtube-container className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
        ) : (
          // eslint-disable-next-line react/no-unknown-property -- Safari AirPlay support
          <video ref={videoRef} className="h-full w-full object-contain" playsInline preload="metadata" x-webkit-airplay="allow">
            {subtitleTracks.map(t => <track key={t.id} kind="subtitles" label={t.label} srcLang={t.language} src={t.src} />)}
          </video>
        )}
      </div>

      <button
        aria-label="سطح المشغل"
        type="button"
        className={cn("absolute inset-0 z-10 bg-transparent", store.zoomFactor > 1 && "cursor-grab active:cursor-grabbing")}
        onClick={store.zoomFactor > 1 ? undefined : handleSurfaceTap}
        onTouchStart={store.zoomFactor > 1 ? undefined : handleTouchStart}
        onTouchMove={store.zoomFactor > 1 ? undefined : handleTouchMove}
        onTouchEnd={store.zoomFactor > 1 ? undefined : handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

<AnimatePresence>
        {!store.isMiniPlayer && store.activeQuestionId && (() => {
          const question = effectiveQuestions.find(q => q.id === store.activeQuestionId);
          if (!question) return null;
          return (
            <SuspendedInteractiveQuestionOverlay
              question={question}
              lessonId={lessonId}
              attemptId={questionAttemptId}
              onAnswer={(isCorrect) => {
                if (isCorrect) {
                  const nextAnswered = [...store.answeredQuestionIds, store.activeQuestionId!];
                  setPlaybackState({ answeredQuestionIds: nextAnswered });
                }
              }}
              onClose={() => {
                setPlaybackState({ activeQuestionId: null });
                getAdapter()?.play();
              }}
            />
          );
        })()}
      </AnimatePresence>

      {!store.isMiniPlayer && <ActiveNotePopup notes={notes} />}

      <AnimatedWatermark
        text={dynamicWatermark}
        positionClass={WATERMARK_POSITIONS[store.watermarkIndex]}
      />

      {!store.isMiniPlayer && (
        <PlayerHeader
          provider={provider}
          lessonTitle={lessonTitle}
          alreadyCompleted={alreadyCompleted}
          markers={mergedMarkers}
          onMarkComplete={() => onLessonAutoComplete?.(lessonId)}
        />
      )}

      {!store.isMiniPlayer && (
        <PlayerOverlays
          onAcceptResume={() => {
            if (store.resumeTime === null) return;
            handleSeek(store.resumeTime);
            setPlaybackState({ resumeTime: null });
            getAdapter()?.play();
          }}
          onDismissResume={() => setPlaybackState({ resumeTime: null })}
          onCancelAutoplay={() => setPlaybackState({ isEnded: false, autoplayCountdown: AUTOPLAY_NEXT_SECONDS })}
          onPlayNextNow={onNextVideo}
          onRetry={() => {
            // Reset the quality override and trigger reload via state update
            setQualityOverride(null);
            setUIState({ errorMessage: null });
            setPlaybackState({ isLoading: true });
          }}
        />
      )}

      <PlayerControls
        markers={mergedMarkers}
        thumbnails={thumbnailCues}
        notes={notes}
        sidebarHasContent={sidebarHasContent}
        isTheaterMode={isTheaterMode}
        canUsePip={provider !== "youtube" && typeof document !== "undefined" && !!document.pictureInPictureEnabled}
        canUseAirPlay={canUseAirPlay}
        onOpenAirPlay={openAirPlayPicker}
        canCast={canCast}
        isCasting={isCasting}
        onToggleCast={toggleCasting}
        onSeek={handleSeek}
        onSeekBy={seekBy}
        onTogglePlayPause={togglePlayPause}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onOpenHelp={() => setUIState({ isHelpOpen: true })}
        onToggleTheater={() => onToggleTheater?.()}
        onTogglePip={togglePip}
        onToggleSidebar={() => setUIState(s => ({ isSidebarOpen: !s.isSidebarOpen }))}
        onToggleFullscreen={toggleFullscreen}
        onToggleSettings={() => setUIState(s => ({ isSettingsOpen: !s.isSettingsOpen, isStatsOpen: false }))}
        onToggleLoop={toggleLoop}
        onCaptureFrame={captureFrame}
        canCaptureFrame={provider !== "youtube"}
        interactiveQuestions={effectiveQuestions}
      />

      {!store.isMiniPlayer && (
        <PlayerPanels
          qualities={store.qualities}
          playbackRates={playbackRates}
          subtitleTracks={subtitleTracks}
          audioTracks={effectiveAudioTracks}
          selectedAudioTrack={store.selectedAudioTrack}
          onChangeAudioTrack={changeAudioTrack}
          lessons={lessons}
          lessonId={lessonId}
          bookmarks={mergedMarkers}
          notes={notes}
          noteDraft={noteDraft}
          selectedSubtitleLabel={store.selectedSubtitle === "off" ? "بدون ترجمة" : (subtitleTracks.find(t => t.id === store.selectedSubtitle)?.label ?? "ترجمة")}
          isNotesSyncing={isNotesSyncing}
          allowAutoQuality={shouldUseHls(activeVideoUrl, provider)}
          onCloseSettings={() => setUIState({ isSettingsOpen: false })}
          onChangeQuality={changeQuality}
          onChangePlaybackRate={handlePlaybackRateChange}
          onChangeSubtitle={changeSubtitle}
          onToggleAmbient={() => {
            const next = !store.isAmbientMode;
            setSettingsState({ isAmbientMode: next });
            flashFeedback({ icon: Sparkles, label: next ? "تفعيل الإضاءة" : "إيقاف الإضاءة" });
          }}
          onChangeBrightness={b => setSettingsState({ brightness: clamp(b, 0.6, 1.3) })}
          onOpenStats={() => setUIState({ isStatsOpen: true, isSettingsOpen: false })}
          onCloseStats={() => setUIState({ isStatsOpen: false })}
          onCloseHelp={() => setUIState({ isHelpOpen: false })}
          onCloseSidebar={() => setUIState({ isSidebarOpen: false })}
          onToggleSidebarTab={(t: import("./player/types").SidebarTab) => setUIState({ sidebarTab: t })}
          onNoteDraftChange={setNoteDraft}
          onAddNoteAtCurrentTime={addNoteAtCurrentTime}
          onInsertTimestamp={() => setNoteDraft(d => `${d}${d ? "\n" : ""}${formatSecondsToTimestamp(stores.playback.getState().currentTime)} `)}
          onRemoveNote={removeNote}
          onJumpToTime={(t) => { handleSeek(t); getAdapter()?.play(); }}
          onLessonChange={onLessonChange}
          hasTranscript={hasTranscript}
          transcriptCues={transcriptCues}
          transcriptQuery={transcriptQuery}
          onTranscriptQueryChange={setTranscriptQuery}
          onToggleShortcuts={() => setUIState(s => ({ isShortcutsOpen: !s.isShortcutsOpen }))}
        />
      )}

      {!store.isMiniPlayer && <SidebarHint visible={!sidebarHasContent} />}
    </div>
  );
}
