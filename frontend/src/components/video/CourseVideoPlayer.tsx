'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Clock3,
  Pause,
  Play,
  Camera,
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
import { InteractiveQuestionOverlay } from "./player/components/InteractiveQuestionOverlay";
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

// Store & Types
import { usePlaybackStore } from "./player/stores/playback-store";
import { useUIStore } from "./player/stores/ui-store";
import { useSettingsStore } from "./player/stores/settings-store";
import type {
  CourseVideoPlayerApi,
  CourseVideoPlayerProps,
  PlayerFeedback,
  QualityOption,
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
  onProgress,
}: CourseVideoPlayerProps) {
  // --- Refs & Internal State ---
  const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
  const provider = useMemo(() => getProvider(activeVideoUrl), [activeVideoUrl]);
  const youtubeId = useMemo(() => parseYouTubeId(activeVideoUrl), [activeVideoUrl]);
  const initialPreferences = useMemo(() => readPlayerPreferences(), []);
  
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
    // Content Protection: Detect blur which often happens when starting a capture tool
    const handleBlur = () => {
      const currentIsPlaying = usePlaybackStore.getState().isPlaying;
      if (currentIsPlaying) setIsRecordingDetected(true);
    };
    const handleFocus = () => setIsRecordingDetected(false);
    
    // Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // PrintScreen / Screenshot Detection
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        // Clear clipboard
        navigator.clipboard?.writeText('').catch(() => undefined);
        setIsRecordingDetected(true);
        setTimeout(() => setIsRecordingDetected(false), 3000);
      }
    };

    // Prevent drag
    const handleDragStart = (e: DragEvent) => {
      if (playerContainerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('dragstart', handleDragStart);
    
    // DevTools Detection (Heuristic)
    const handleResize = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      if (widthDiff > threshold || heightDiff > threshold) {
        setIsRecordingDetected(true);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('resize', handleResize);
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
  }, [getAdapter, interactiveQuestions, flashFeedback, onProgress]);

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
  }, [getAdapter, resetControlsTimeout, syncPlaybackSnapshot]);

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
  }, [flashFeedback, getAdapter, resetControlsTimeout]);

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
  }, [flashFeedback, getAdapter, resetControlsTimeout, store.isMuted, store.volume]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    const safeVolume = clamp(nextVolume, 0, 1);
    adapter.setVolume(safeVolume);
    adapter.setMuted(safeVolume === 0);
    setPlaybackState({ volume: safeVolume, isMuted: safeVolume === 0 });
    resetControlsTimeout();
  }, [getAdapter, resetControlsTimeout]);

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
  }, [flashFeedback, getAdapter, provider, resetControlsTimeout, youtubePlaybackRates]);

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
  }, [resetControlsTimeout]);

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
  }, [provider, resetControlsTimeout]);

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
  }, [flashFeedback]);

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
  }, [applySubtitleSelection, flashFeedback, subtitleTracks]);

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
    setPlaybackState({ isLoading: true });
    setActiveVideoUrl(source.src);
    flashFeedback({ icon: Settings2, label: source.label });
  }, [flashFeedback, getAdapter, hlsRef, qualitySources, store.isPlaying]);

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
    togglePlayPause, seekBy, handleVolumeChange, flashFeedback, resetControlsTimeout
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

  // --- Sync & Lifecycle Effects ---
  useEffect(() => {
    setActiveVideoUrl(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    const resetPlaybackState = usePlaybackStore.getState().resetPlaybackState;
    const resetUIState = useUIStore.getState().resetUIState;
    const resetSettingsState = useSettingsStore.getState().resetSettingsState;

    resetPlaybackState({
      isLoading: true,
      volume: initialPreferences.volume,
      isMuted: initialPreferences.isMuted,
      playbackRate: initialPreferences.playbackRate,
    });
    resetUIState({
      isSidebarOpen: initialPreferences.isSidebarOpen ?? false,
      sidebarTab: initialPreferences.sidebarTab ?? "bookmarks",
    });
    resetSettingsState({
      isAmbientMode: initialPreferences.isAmbientMode,
      selectedSubtitle: initialPreferences.selectedSubtitle,
      brightness: initialPreferences.brightness,
    });
    setYoutubePlaybackRates([]);
    setNoteDraft("");
  }, [initialPreferences, lessonId]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setSettingsState((s) => ({ watermarkIndex: (s.watermarkIndex + 1) % WATERMARK_POSITIONS.length }));
    }, 12000);
    return () => clearInterval(interval);
  }, [setSettingsState]);

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

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("waiting", () => setPlaybackState({ isLoading: true }));
    v.addEventListener("playing", () => setPlaybackState({ isLoading: false }));
    
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
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
  }, [store.autoplayCountdown, store.isEnded, onNextVideo]);

  // Watch Time Tracking Effect
  useEffect(() => {
    let intervalId: number | null = null;
    if (store.isPlaying) {
      intervalId = window.setInterval(() => {
        useSettingsStore.getState().incrementWatchSeconds(1);
      }, 1000);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [store.isPlaying]);

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
          <div ref={youtubeContainerRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
        ) : (
          <video ref={videoRef} className="h-full w-full object-contain" playsInline preload="metadata">
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
            <InteractiveQuestionOverlay
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
            setUIState({ errorMessage: null });
            setPlaybackState({ isLoading: true });
            setActiveVideoUrl(videoUrl);
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
          onToggleShortcuts={() => setUIState(s => ({ isShortcutsOpen: !s.isShortcutsOpen }))}
        />
      )}

      {!store.isMiniPlayer && <SidebarHint visible={!sidebarHasContent} />}
    </div>
  );
}
