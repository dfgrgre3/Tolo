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
import { RecordingDetectionOverlay } from "@/app/(education)/courses/components/_components/RecordingDetectionOverlay";
import { AnimatedWatermark } from "@/app/(education)/courses/components/_components/AnimatedWatermark";
import { SidebarHint } from "@/app/(education)/courses/components/_components/SidebarHint";

import {
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
import { useAuth } from "@/hooks/use-auth";
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

// Store & Types
import { usePlaybackStore } from "./player/stores/playback-store";
import { useUIStore } from "./player/stores/ui-store";
import { useSettingsStore } from "./player/stores/settings-store";
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
  mergeChapterMarkers,
  parseThumbnailVtt,
  parseYouTubeId,
  readPlayerPreferences,
  shouldUseHls,
} from "./player/utils";

export function CourseVideoPlayer({
  courseId,
  lessonId,
  lessonTitle,
  videoUrl,
  alreadyCompleted = false,
  onLessonAutoComplete,
  onNextVideo,
  playerApiRef: _playerApiRef,
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
  onProgress,
}: CourseVideoPlayerProps) {
  // --- Refs & Internal State ---
  // Quality switches (non-HLS) temporarily override the URL. The override is tagged with the
  // `videoUrl` it was created for, so a URL change coming from the parent (lesson switch)
  // automatically invalidates it — no reset effect and no ref access during render.
  const [qualityOverride, setQualityOverride] = useState<{ forVideoUrl: string; src: string } | null>(null);
  const activeVideoUrl = qualityOverride?.forVideoUrl === videoUrl ? qualityOverride.src : videoUrl;
  const provider = useMemo(() => getProvider(activeVideoUrl), [activeVideoUrl]);
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

  const [thumbnailCues, setThumbnailCues] = useState<ReturnType<typeof parseThumbnailVtt>>([]);
  const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([]);

  // Stores State selection
  const setPlaybackState = usePlaybackStore((s) => s.setPlaybackState);
  const setUIState = useUIStore((s) => s.setUIState);
  const setSettingsState = useSettingsStore((s) => s.setSettingsState);
  
  const playbackStore = usePlaybackStore(useShallow((s) => ({
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

  const uiStore = useUIStore(useShallow((s) => ({
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

  const settingsStore = useSettingsStore(useShallow((s) => ({
    isAmbientMode: s.isAmbientMode,
    brightness: s.brightness,
    watermarkIndex: s.watermarkIndex,
    selectedSubtitle: s.selectedSubtitle,
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
      const isPlaying = usePlaybackStore.getState().isPlaying;
      const { isSettingsOpen, isSidebarOpen, isHelpOpen, isStatsOpen } = useUIStore.getState();
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

  // --- Security & Content Protection ---
  const { user } = useAuth();
  const [isRecordingDetected, setIsRecordingDetected] = useState(false);

  // --- Zoom, Pan & Mini-player ---
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const storeState = useSettingsStore.getState();
    if (storeState.zoomFactor > 1) {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - storeState.panOffset.x, y: e.clientY - storeState.panOffset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPanningRef.current) return;
    const storeState = useSettingsStore.getState();
    const newX = e.clientX - startPanRef.current.x;
    const newY = e.clientY - startPanRef.current.y;
    const maxPanX = (storeState.zoomFactor - 1) * 350;
    const maxPanY = (storeState.zoomFactor - 1) * 200;
    setSettingsState({
      panOffset: {
        x: clamp(newX, -maxPanX, maxPanX),
        y: clamp(newY, -maxPanY, maxPanY)
      }
    });
  }, [setSettingsState]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    const storeState = useSettingsStore.getState();
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
        const storeState = useSettingsStore.getState();
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

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const isPlaying = usePlaybackStore.getState().isPlaying;
        const isFullscreen = useUIStore.getState().isFullscreen;
        const shouldFloat = !entry.isIntersecting && isPlaying && !isFullscreen;
        setUIState({ isMiniPlayer: shouldFloat });
      },
      { threshold: 0.15 }
    );

    observer.observe(container);
    return () => {
      observer.unobserve(container);
    };
  }, [setUIState]);
  
  const dynamicWatermark = useMemo(() => {
    if (!user) return watermarkText;
    return `${user.name || user.username} | ${user.phone || "Verified"} | ${new Date().toLocaleDateString('ar-EG')}`;
  }, [user, watermarkText]);

  useEffect(() => {
    const container = playerContainerRef.current;

    // Content Protection: Detect blur which often happens when starting a capture tool.
    // These MUST stay on `window` — they need global scope to detect tab switches / capture tools.
    const handleBlur = () => {
      const currentIsPlaying = usePlaybackStore.getState().isPlaying;
      if (currentIsPlaying) setIsRecordingDetected(true);
    };
    const handleFocus = () => setIsRecordingDetected(false);

    // PrintScreen / Screenshot Detection — global by necessity
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText('').catch(() => undefined);
        setIsRecordingDetected(true);
        setTimeout(() => setIsRecordingDetected(false), 3000);
      }
    };

    // DevTools Detection (Heuristic) — global by necessity.
    // Debounced by 500ms to prevent false positives for users with multiple
    // monitors, tablet pen input, or those who resize the browser window
    // normally. The overlay only appears if the window stays in a suspicious
    // state for half a second, which genuine users never trigger.
    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        resizeDebounceTimer = null;
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > threshold || heightDiff > threshold) {
          setIsRecordingDetected(true);
        }
      }, 500);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    // FIX: Scope contextmenu to the video/iframe element ONLY — not the entire container.
    // Blocking right-click on the whole container prevented users from right-clicking
    // on control buttons, captions, and UI overlays, and could conflict with DnD libraries.
    // Now we only suppress the browser's native video context menu (which exposes "Save video"),
    // while allowing right-click on all other player UI elements.
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isVideoElement = target.tagName === 'VIDEO';
      const isYouTubeEmbed = !!target.closest('[data-youtube-container]');
      if (isVideoElement || isYouTubeEmbed) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
      container.addEventListener('dragstart', handleDragStart);
    }

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      // Cancel any pending debounce timer on unmount
      if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
      if (container) {
        container.removeEventListener('contextmenu', handleContextMenu);
        container.removeEventListener('dragstart', handleDragStart);
      }
    };
  }, []);

  // --- Hook: HLS Engine ---
  const hlsRef = useHlsEngine({ activeVideoUrl, provider, videoRef, flashFeedback });

  // --- Hook: Frame Capture ---
  const captureFrame = useFrameCapture({ videoRef, provider, flashFeedback, lessonTitle });

  // --- Playback Loop Management ---
  const syncPlaybackSnapshot = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;

    const nextTime = adapter.getCurrentTime();
    const duration = adapter.getDuration();
    const buffered = adapter.getBuffered();

    const { loopStart, loopEnd, activeQuestionId, answeredQuestionIds } = usePlaybackStore.getState();
    
    // Interactive Questions Detection
    const currentSecond = Math.floor(nextTime);
    if (interactiveQuestions.length > 0 && !activeQuestionId && currentSecond !== lastCheckedSecondRef.current) {
      const question = interactiveQuestions.find(q => 
        Math.abs((q.timePosition ?? q.time ?? 0) - nextTime) < 0.8 && !answeredQuestionIds.includes(q.id)
      );
      if (question) {
        lastCheckedSecondRef.current = currentSecond;
        adapter.pause();
        setPlaybackState({ activeQuestionId: question.id });
        setPlaybackState({ isPlaying: false });
        setUIState({ showControls: true });
        flashFeedback({ icon: HelpCircle, label: "سؤال تفاعلي" });
        return; // Stop sync until answered
      }
    }

    if (loopStart !== null && loopEnd !== null && nextTime >= loopEnd) {
      adapter.seekTo(loopStart);
      setPlaybackState({ currentTime: loopStart });
    } else {
      setPlaybackState({
        currentTime: nextTime,
        duration,
        buffered,
      });
    }

    // Call onProgress callback to update parent component
    if (onProgress) {
      onProgress(nextTime, duration);
    }
  }, [getAdapter, interactiveQuestions, flashFeedback, onProgress, setPlaybackState, setUIState]);

  const stopPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const runPlaybackLoop = useCallback(() => {
    syncPlaybackSnapshot();
    saveProgress();
    if (usePlaybackStore.getState().isPlaying) {
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
    syncPlaybackSnapshot();
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
      if (usePlaybackStore.getState().isPlaying) {
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

  const toggleLoop = useCallback(() => {
    const { loopStart, loopEnd, currentTime } = usePlaybackStore.getState();
    if (loopStart === null) {
      setPlaybackState({ loopStart: currentTime });
      flashFeedback({ icon: Repeat, label: "تم تحديد نقطة البداية (A)" });
    } else if (loopEnd === null) {
      if (currentTime <= loopStart) {
        flashFeedback({ icon: Repeat, label: "يجب أن تكون النهاية بعد البداية" });
        return;
      }
      setPlaybackState({ loopEnd: currentTime });
      flashFeedback({ icon: Repeat, label: "تم تفعيل التكرار (A-B)" });
    } else {
      setPlaybackState({ loopStart: null, loopEnd: null });
      flashFeedback({ icon: Repeat, label: "إيقاف التكرار" });
    }
  }, [flashFeedback, setPlaybackState]);

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

  const changeQuality = useCallback((qualityId: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.currentLevel = qualityId;
      setSettingsState({ selectedQuality: qualityId });
      flashFeedback({
        icon: Settings2,
        label: qualityId === -1 ? `تلقائي` : `جودة ${qualityId}p`
      });
      return;
    }
    const source = qualitySources.find(q => q.id === qualityId);
    if (!source) return;
    pendingSourceSwitchRef.current = {
      time: getAdapter()?.getCurrentTime() ?? 0,
      shouldResume: store.isPlaying
    };
    setSettingsState({ selectedQuality: qualityId });
    setQualityOverride({ forVideoUrl: videoUrl, src: source.src });
    setPlaybackState({ isLoading: true });
    flashFeedback({ icon: Settings2, label: source.label });
  }, [flashFeedback, getAdapter, hlsRef, qualitySources, setPlaybackState, setSettingsState, store.isPlaying, videoUrl]);

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
    togglePlayPause, seekBy, handleVolumeChange, resetControlsTimeout
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
    const resetPlaybackState = usePlaybackStore.getState().resetPlaybackState;
    const resetUIState = useUIStore.getState().resetUIState;
    const resetSettingsState = useSettingsStore.getState().resetSettingsState;

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
      brightness: store.brightness,
      isSidebarOpen: store.isSidebarOpen,
      sidebarTab: store.sidebarTab,
    }));
  }, [store.brightness, store.isAmbientMode, store.isMuted, store.playbackRate, store.selectedSubtitle, store.volume, store.isSidebarOpen, store.sidebarTab]);

  useEffect(() => {
    if (!thumbnailVttUrl) return;
    fetch(thumbnailVttUrl, { cache: "force-cache" })
      .then(r => r.ok ? r.text() : "")
      .then(txt => txt && setThumbnailCues(parseThumbnailVtt(txt, thumbnailVttUrl)))
      .catch(() => setThumbnailCues([]));
  }, [thumbnailVttUrl]);

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
        useSettingsStore.getState().incrementWatchSeconds(1);
      }, 1000);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
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
        <button
          type="button"
          onClick={() => {
            getAdapter()?.pause();
            setUIState({ isMiniPlayer: false });
          }}
          className="absolute top-3 right-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-105 transition active:scale-95"
          aria-label="إغلاق الفيديو المصغر"
        >
          ✕
        </button>
      )}

      <RecordingDetectionOverlay isDetected={isRecordingDetected} />

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
          const question = interactiveQuestions.find(q => q.id === store.activeQuestionId);
          if (!question) return null;
          return (
            <SuspendedInteractiveQuestionOverlay
              question={question}
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
        interactiveQuestions={interactiveQuestions}
      />

      {!store.isMiniPlayer && (
        <PlayerPanels
          qualities={store.qualities}
          playbackRates={playbackRates}
          subtitleTracks={subtitleTracks}
          audioTracks={audioTracks}
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
          onInsertTimestamp={() => setNoteDraft(d => `${d}${d ? "\n" : ""}${formatSecondsToTimestamp(usePlaybackStore.getState().currentTime)} `)}
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
