"use client";

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
  Lock,
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
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
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
import { useAuth } from "@/contexts/auth-context";
import { useYouTubePlayer } from "./player/hooks/useYouTubePlayer";
import { useKeyboardShortcuts } from "./player/hooks/useKeyboardShortcuts";
import { useTouchGestures } from "./player/hooks/useTouchGestures";
import { useProgressPersistence } from "./player/hooks/useProgressPersistence";
import { useHlsEngine } from "./player/hooks/useHlsEngine";
import { usePlayerAdapter } from "./player/hooks/usePlayerAdapter";
import { useTimelineNotes } from "./player/hooks/useTimelineNotes";
import { useFrameCapture } from "./player/hooks/useFrameCapture";

// Store & Types
import {
  defaultPlayerUiState,
  useCourseVideoPlayerStore,
} from "./player/store";
import type {
  CourseVideoPlayerApi,
  CourseVideoPlayerProps,
  PlayerFeedback,
  PlayerPreferences,
  QualityOption,
  YouTubeRuntimePlayer,
} from "./player/types";

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

  const [thumbnailCues, setThumbnailCues] = useState<ReturnType<typeof parseThumbnailVtt>>([]);
  const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([]);

  // --- Store State ---
  const setPlayerState = useCourseVideoPlayerStore((state) => state.setPlayerState);
  const resetPlayerState = useCourseVideoPlayerStore((state) => state.resetPlayerState);
  
  const store = useCourseVideoPlayerStore(useShallow((s) => ({
    volume: s.volume,
    isMuted: s.isMuted,
    playbackRate: s.playbackRate,
    isAmbientMode: s.isAmbientMode,
    brightness: s.brightness,
    watermarkIndex: s.watermarkIndex,
    isFullscreen: s.isFullscreen,
    selectedSubtitle: s.selectedSubtitle,
    isPlaying: s.isPlaying,
    autoplayCountdown: s.autoplayCountdown,
    isEnded: s.isEnded,
    qualities: s.qualities,
    errorMessage: s.errorMessage,
    currentTime: s.currentTime,
    resumeTime: s.resumeTime,
    sidebarTab: s.sidebarTab,
    isSidebarOpen: s.isSidebarOpen,
    showControls: s.showControls,
    activeQuestionId: s.activeQuestionId,
    answeredQuestionIds: s.answeredQuestionIds,
  })));

  // --- Helpers ---
  const flashFeedback = useCallback((feedback: NonNullable<PlayerFeedback>) => {
    setPlayerState({ feedback });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => setPlayerState({ feedback: null }), 850);
  }, [setPlayerState]);

  const resetControlsTimeout = useCallback(() => {
    setPlayerState({ showControls: true });
    if (playerContainerRef.current) playerContainerRef.current.style.cursor = "default";
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = window.setTimeout(() => {
      const s = useCourseVideoPlayerStore.getState();
      if (s.isPlaying && !s.isSettingsOpen && !s.isSidebarOpen && !s.isHelpOpen && !s.isStatsOpen) {
        setPlayerState({ showControls: false });
        if (playerContainerRef.current) playerContainerRef.current.style.cursor = "none";
      }
    }, CONTROLS_HIDE_TIMEOUT_MS);
  }, [setPlayerState]);

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
    triggerAutoComplete: () => onLessonAutoComplete?.(),
    alreadyCompleted,
  });

  // --- Security & Content Protection ---
  const { user } = useAuth();
  const [isRecordingDetected, setIsRecordingDetected] = useState(false);
  
  const dynamicWatermark = useMemo(() => {
    if (!user) return watermarkText;
    return `${user.name || user.username} | ${user.phone || "Verified"} | ${new Date().toLocaleDateString('ar-EG')}`;
  }, [user, watermarkText]);

  useEffect(() => {
    // Content Protection: Detect blur which often happens when starting a capture tool
    const handleBlur = () => {
      if (store.isPlaying) setIsRecordingDetected(true);
    };
    const handleFocus = () => setIsRecordingDetected(false);
    
    // Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);
    
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
      window.removeEventListener('resize', handleResize);
    };
  }, [store.isPlaying]);

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

    const { loopStart, loopEnd, activeQuestionId, answeredQuestionIds } = useCourseVideoPlayerStore.getState();
    
    // Interactive Questions Detection
    if (interactiveQuestions.length > 0 && !activeQuestionId) {
      const question = interactiveQuestions.find(q => 
        Math.abs(q.time - nextTime) < 0.8 && !answeredQuestionIds.has(q.id)
      );
      if (question) {
        adapter.pause();
        setPlayerState({ activeQuestionId: question.id, isPlaying: false, showControls: true });
        flashFeedback({ icon: HelpCircle, label: "سؤال تفاعلي" });
        return; // Stop sync until answered
      }
    }

    if (loopStart !== null && loopEnd !== null && nextTime >= loopEnd) {
      adapter.seekTo(loopStart);
      setPlayerState({ currentTime: loopStart });
    } else {
      setPlayerState({
        currentTime: nextTime,
        duration,
        buffered,
      });
    }
  }, [getAdapter, setPlayerState, interactiveQuestions, flashFeedback]);

  const stopPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const runPlaybackLoop = useCallback(() => {
    syncPlaybackSnapshot();
    saveProgress();
    if (useCourseVideoPlayerStore.getState().isPlaying) {
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
    setPlayerState({ currentTime: nextTime, resumeTime: null, isEnded: false });
    syncPlaybackSnapshot();
    resetControlsTimeout();
  }, [getAdapter, resetControlsTimeout, setPlayerState, syncPlaybackSnapshot]);

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
      if (useCourseVideoPlayerStore.getState().isPlaying) {
        adapter.pause();
        flashFeedback({ icon: Pause, label: "إيقاف مؤقت" });
      } else {
        await adapter.play();
        flashFeedback({ icon: Play, label: "تشغيل" });
      }
    } catch {
      setPlayerState({ errorMessage: "تعذر تشغيل الفيديو الحالي." });
    }
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setPlayerState]);

  const toggleMute = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;
    const nextMuted = !store.isMuted;
    adapter.setMuted(nextMuted);
    if (!nextMuted && store.volume === 0) {
      adapter.setVolume(0.5);
      setPlayerState({ volume: 0.5 });
    }
    setPlayerState({ isMuted: nextMuted });
    flashFeedback({ icon: nextMuted ? VolumeX : Volume2, label: nextMuted ? "كتم" : "صوت" });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setPlayerState, store.isMuted, store.volume]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    const safeVolume = clamp(nextVolume, 0, 1);
    adapter.setVolume(safeVolume);
    adapter.setMuted(safeVolume === 0);
    setPlayerState({ volume: safeVolume, isMuted: safeVolume === 0 });
    resetControlsTimeout();
  }, [getAdapter, resetControlsTimeout, setPlayerState]);

  const handlePlaybackRateChange = useCallback((nextRate: number) => {
    const adapter = getAdapter();
    if (!adapter) return;
    if (provider === "youtube" && !youtubePlaybackRates.includes(nextRate)) {
      flashFeedback({ icon: Settings2, label: "هذه السرعة غير مدعومة على YouTube" });
      return;
    }
    adapter.setPlaybackRate(nextRate);
    setPlayerState({ playbackRate: nextRate });
    flashFeedback({ icon: Settings2, label: `${nextRate}x` });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, provider, resetControlsTimeout, setPlayerState, youtubePlaybackRates]);

  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      setPlayerState({ errorMessage: "تعذر تفعيل وضع ملء الشاشة." });
    }
    resetControlsTimeout();
  }, [resetControlsTimeout, setPlayerState]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      setPlayerState({ errorMessage: "وضع النافذة العائمة غير متاح لهذا المتصفح." });
    }
    resetControlsTimeout();
  }, [provider, resetControlsTimeout, setPlayerState]);

  const toggleLoop = useCallback(() => {
    const { loopStart, loopEnd, currentTime } = useCourseVideoPlayerStore.getState();
    if (loopStart === null) {
      setPlayerState({ loopStart: currentTime });
      flashFeedback({ icon: Repeat, label: "تم تحديد نقطة البداية (A)" });
    } else if (loopEnd === null) {
      if (currentTime <= loopStart) {
        flashFeedback({ icon: Repeat, label: "يجب أن تكون النهاية بعد البداية" });
        return;
      }
      setPlayerState({ loopEnd: currentTime });
      flashFeedback({ icon: Repeat, label: "تم تفعيل التكرار (A-B)" });
    } else {
      setPlayerState({ loopStart: null, loopEnd: null });
      flashFeedback({ icon: Repeat, label: "إيقاف التكرار" });
    }
  }, [flashFeedback, setPlayerState]);

  const applySubtitleSelection = useCallback((subtitleId: string) => {
    if (provider === "youtube" || !videoRef.current) return;
    Array.from(videoRef.current.textTracks).forEach((track, idx) => {
      track.mode = subtitleId !== "off" && subtitleTracks[idx]?.id === subtitleId ? "showing" : "disabled";
    });
  }, [provider, subtitleTracks]);

  const changeSubtitle = useCallback((id: string) => {
    applySubtitleSelection(id);
    setPlayerState({ selectedSubtitle: id });
    flashFeedback({
      icon: Settings2,
      label: id === "off" ? "الترجمة متوقفة" : (subtitleTracks.find(t => t.id === id)?.label ?? "ترجمة")
    });
  }, [applySubtitleSelection, flashFeedback, setPlayerState, subtitleTracks]);

  const changeQuality = useCallback((qualityId: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.currentLevel = qualityId;
      setPlayerState({ selectedQuality: qualityId });
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
    setPlayerState({ selectedQuality: qualityId, isLoading: true });
    setActiveVideoUrl(source.src);
    flashFeedback({ icon: Settings2, label: source.label });
  }, [flashFeedback, getAdapter, hlsRef, qualitySources, setPlayerState, store.isPlaying]);

  // --- Hook Integration: Keyboard & Touch ---
  const handleKeyboardShortcuts = useKeyboardShortcuts({
    togglePlayPause, seekBy, handleSeek, handleVolumeChange, toggleMute, toggleFullscreen, togglePip,
    onToggleTheater, changeSubtitle, setOpenPanel: (p) => setPlayerState({
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

  // --- Sync & Lifecycle Effects ---
  useEffect(() => {
    setActiveVideoUrl(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    resetPlayerState({
      ...defaultPlayerUiState,
      isLoading: true,
      volume: initialPreferences.volume,
      isMuted: initialPreferences.isMuted,
      playbackRate: initialPreferences.playbackRate,
      isAmbientMode: initialPreferences.isAmbientMode,
      selectedSubtitle: initialPreferences.selectedSubtitle,
      brightness: initialPreferences.brightness,
      isSidebarOpen: initialPreferences.isSidebarOpen ?? false,
      sidebarTab: initialPreferences.sidebarTab ?? "bookmarks",
    });
    setYoutubePlaybackRates([]);
    setNoteDraft("");
  }, [initialPreferences, resetPlayerState, lessonId]);

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
    const onFullscreen = () => setPlayerState({ isFullscreen: !!document.fullscreenElement });
    const onPip = () => setPlayerState({ isPip: !!document.pictureInPictureElement });
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("enterpictureinpicture", onPip);
    document.addEventListener("leavepictureinpicture", onPip);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("enterpictureinpicture", onPip);
      document.removeEventListener("leavepictureinpicture", onPip);
    };
  }, [setPlayerState]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerState((s) => ({ watermarkIndex: (s.watermarkIndex + 1) % WATERMARK_POSITIONS.length }));
    }, 12000);
    return () => clearInterval(interval);
  }, [setPlayerState]);

  // Video Element Events
  useEffect(() => {
    const v = videoRef.current;
    if (!v || provider === "youtube") return;

    const onLoaded = () => {
      setPlayerState({ isLoading: false, duration: v.duration });
      if (pendingSourceSwitchRef.current) {
        const p = pendingSourceSwitchRef.current;
        pendingSourceSwitchRef.current = null;
        v.currentTime = p.time;
        if (p.shouldResume) void v.play();
      } else {
        void loadResumeData();
      }
    };
    const onPlay = () => { setPlayerState({ isPlaying: true, isEnded: false }); startPlaybackLoop(); };
    const onPause = () => { setPlayerState({ isPlaying: false }); stopPlaybackLoop(); saveProgress(true); };
    const onEnded = () => {
      setPlayerState({ isPlaying: false, isEnded: true, autoplayCountdown: AUTOPLAY_NEXT_SECONDS });
      saveProgress(true);
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("waiting", () => setPlayerState({ isLoading: true }));
    v.addEventListener("playing", () => setPlayerState({ isLoading: false }));
    
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [loadResumeData, provider, saveProgress, setPlayerState, startPlaybackLoop, stopPlaybackLoop]);

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
      setPlayerState({ isLoading: false, duration: p.getDuration() });
      setYoutubePlaybackRates(p.getAvailablePlaybackRates() ?? []);
      void loadResumeData();
    },
    onStateChange: (state, player, api) => {
      if (state === api.PlayerState.PLAYING) { setPlayerState({ isPlaying: true, isEnded: false }); startPlaybackLoop(); }
      else if (state === api.PlayerState.PAUSED) { setPlayerState({ isPlaying: false }); stopPlaybackLoop(); saveProgress(true); }
      else if (state === api.PlayerState.ENDED) {
        setPlayerState({ isPlaying: false, isEnded: true, autoplayCountdown: AUTOPLAY_NEXT_SECONDS });
        saveProgress(true);
      }
    }
  });

  // Autoplay Effect
  useEffect(() => {
    if (!store.isEnded || !onNextVideo) return;
    if (store.autoplayCountdown <= 0) { onNextVideo(); return; }
    const t = setTimeout(() => setPlayerState(s => ({ autoplayCountdown: s.autoplayCountdown - 1 })), 1000);
    return () => clearTimeout(t);
  }, [store.autoplayCountdown, store.isEnded, onNextVideo, setPlayerState]);

  // --- Computed Values ---
  const mergedMarkers = useMemo(() => mergeChapterMarkers(bookmarks, chapterMarkers), [bookmarks, chapterMarkers]);
  const sidebarHasContent = mergedMarkers.length > 0 || notes.length > 0 || lessons.length > 0;
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
        "group/player relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#030712] text-white shadow-[0_28px_90px_rgba(2,6,23,0.45)] outline-none",
        store.isFullscreen && "rounded-none",
        className
      )}
    >
      <AnimatePresence>
        {isRecordingDetected && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center text-center p-8"
          >
            <div className="space-y-4">
              <Lock className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
              <h3 className="text-2xl font-bold text-white">حماية المحتوى نشطة</h3>
              <p className="text-gray-400 max-w-md">
                يرجى العودة إلى نافذة المتصفح للمتابعة. يمنع تسجيل الشاشة أو تصوير المحتوى حرصاً على حقوق المنصة.
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AmbientBackground videoRef={videoRef} provider={provider} />
      <GestureOverlay mode={gestureActiveMode} value={gestureValue} visible={!!gestureActiveMode} />
      <SkipIntroButton currentTime={store.currentTime} markers={mergedMarkers} onSkip={handleSeek} />

      <div className="absolute inset-0" style={{ filter: `brightness(${store.brightness})` }}>
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
        className="absolute inset-0 z-10 bg-transparent"
        onClick={handleSurfaceTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <AnimatePresence>
        {store.activeQuestionId && (
          <InteractiveQuestionOverlay
            question={interactiveQuestions.find(q => q.id === store.activeQuestionId)!}
            onAnswer={(isCorrect) => {
              if (isCorrect) {
                const nextAnswered = new Set(store.answeredQuestionIds);
                nextAnswered.add(store.activeQuestionId!);
                setPlayerState({ answeredQuestionIds: nextAnswered });
              }
            }}
            onClose={() => {
              setPlayerState({ activeQuestionId: null });
              void getAdapter()?.play();
            }}
          />
        )}
      </AnimatePresence>

      <ActiveNotePopup
        text={notes.find(n => Math.abs(n.time - store.currentTime) < 2)?.text || ""}
        visible={notes.some(n => Math.abs(n.time - store.currentTime) < 2)}
      />

      <m.div
        animate={{
          x: [0, 100, -100, 0],
          y: [0, -50, 50, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className={cn(
          "pointer-events-none absolute z-20 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/40 backdrop-blur-md",
          WATERMARK_POSITIONS[store.watermarkIndex]
        )}
      >
        {dynamicWatermark}
      </m.div>

      <PlayerHeader
        provider={provider}
        lessonTitle={lessonTitle}
        alreadyCompleted={alreadyCompleted}
        markers={mergedMarkers}
        onMarkComplete={() => onLessonAutoComplete?.()}
      />

      <PlayerOverlays
        onAcceptResume={() => {
          if (store.resumeTime === null) return;
          handleSeek(store.resumeTime);
          setPlayerState({ resumeTime: null });
          void getAdapter()?.play();
        }}
        onDismissResume={() => setPlayerState({ resumeTime: null })}
        onCancelAutoplay={() => setPlayerState({ isEnded: false, autoplayCountdown: AUTOPLAY_NEXT_SECONDS })}
        onPlayNextNow={onNextVideo}
      />

      <PlayerControls
        markers={mergedMarkers}
        thumbnails={thumbnailCues}
        sidebarHasContent={sidebarHasContent}
        isTheaterMode={isTheaterMode}
        canUsePip={provider !== "youtube" && typeof document !== "undefined" && !!document.pictureInPictureEnabled}
        onSeek={handleSeek}
        onSeekBy={seekBy}
        onTogglePlayPause={togglePlayPause}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onOpenHelp={() => setPlayerState({ isHelpOpen: true })}
        onToggleTheater={() => onToggleTheater?.()}
        onTogglePip={togglePip}
        onToggleSidebar={() => setPlayerState(s => ({ isSidebarOpen: !s.isSidebarOpen }))}
        onToggleFullscreen={toggleFullscreen}
        onToggleSettings={() => setPlayerState(s => ({ isSettingsOpen: !s.isSettingsOpen, isStatsOpen: false }))}
        onToggleLoop={toggleLoop}
        onCaptureFrame={captureFrame}
      />

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
        canCopyLink={typeof navigator !== "undefined" && !!navigator.clipboard}
        isNotesSyncing={isNotesSyncing}
        allowAutoQuality={shouldUseHls(activeVideoUrl, provider)}
        onCloseSettings={() => setPlayerState({ isSettingsOpen: false })}
        onChangeQuality={changeQuality}
        onChangePlaybackRate={handlePlaybackRateChange}
        onChangeSubtitle={changeSubtitle}
        onToggleAmbient={() => {
          const next = !store.isAmbientMode;
          setPlayerState({ isAmbientMode: next });
          flashFeedback({ icon: Sparkles, label: next ? "تفعيل الإضاءة" : "إيقاف الإضاءة" });
        }}
        onChangeBrightness={b => setPlayerState({ brightness: clamp(b, 0.6, 1.3) })}
        onRestartPlayback={() => { handleSeek(0); void getAdapter()?.play(); flashFeedback({ icon: Play, label: "إعادة التشغيل" }); }}
        onOpenStats={() => setPlayerState({ isStatsOpen: true, isSettingsOpen: false })}
        onCopyLessonLink={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            flashFeedback({ icon: Settings2, label: "تم نسخ الرابط" });
          } catch {
            setPlayerState({ errorMessage: "تعذر نسخ رابط الدرس." });
          }
        }}
        onCloseStats={() => setPlayerState({ isStatsOpen: false })}
        onCloseHelp={() => setPlayerState({ isHelpOpen: false })}
        onCloseSidebar={() => setPlayerState({ isSidebarOpen: false })}
        onToggleSidebarTab={t => setPlayerState({ sidebarTab: t })}
        onNoteDraftChange={setNoteDraft}
        onAddNoteAtCurrentTime={addNoteAtCurrentTime}
        onInsertTimestamp={() => setNoteDraft(d => `${d}${d ? "\n" : ""}${formatSecondsToTimestamp(store.currentTime)} `)}
        onRemoveNote={removeNote}
        onJumpToTime={(t) => { handleSeek(t); void getAdapter()?.play(); }}
        onLessonChange={onLessonChange}
      />

      {!sidebarHasContent && (
        <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-[22px] border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-white/55 backdrop-blur-lg lg:block">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            <span>الأدوات الجانبية ستتوسع تلقائيًا عند وجود معالم أو ملاحظات أو دروس.</span>
          </div>
        </div>
      )}
    </div>
  );
}

