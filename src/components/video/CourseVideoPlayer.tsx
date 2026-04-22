"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Hls from "hls.js";
import { useShallow } from "zustand/react/shallow";
import {
  Clock3,
  Lock,
  Settings2,
  SkipBack,
  SkipForward,
  Sparkles,
  SunMedium,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AUTO_COMPLETE_PERCENT,
  AUTOPLAY_NEXT_SECONDS,
  CONTROLS_HIDE_TIMEOUT_MS,
  MIN_RESUME_TIME_SECONDS,
  PLAYER_PREFERENCES_KEY,
  PLAYBACK_RATES,
  PROGRESS_SAVE_INTERVAL_MS,
  SEEK_STEP_SECONDS,
  WATERMARK_POSITIONS,
} from "./player/constants";
import { PlayerControls } from "./player/components/PlayerControls";
import { PlayerHeader } from "./player/components/PlayerHeader";
import { PlayerOverlays } from "./player/components/PlayerOverlays";
import { PlayerPanels } from "./player/components/PlayerPanels";
import { useYouTubePlayer } from "./player/hooks/useYouTubePlayer";
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
  StoredVideoProgress,
  TimelineNote,
} from "./player/types";
import {
  clamp,
  createTimelineNote,
  formatSecondsToTimestamp,
  getProvider,
  mergeChapterMarkers,
  parseCloudTimelineNotes,
  parseThumbnailVtt,
  parseYouTubeId,
  readPlayerPreferences,
  serializeCloudTimelineNotes,
  shouldUseHls,
} from "./player/utils";

type PlayerAdapter = {
  canUsePip: boolean;
  getBuffered: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  pause: () => void;
  play: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
};

type YouTubeRuntimePlayer = {
  destroy: () => void;
  getAvailablePlaybackRates: () => number[];
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (playbackRate: number) => void;
  setVolume: (volume: number) => void;
  unMute: () => void;
};

type TouchGestureState = {
  mode: "volume" | "brightness" | null;
  startX: number;
  startY: number;
  startValue: number;
  moved: boolean;
};

function readStoredProgress(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredVideoProgress) : null;
  } catch {
    return null;
  }
}

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
}: CourseVideoPlayerProps) {
  const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
  const provider = useMemo(() => getProvider(activeVideoUrl), [activeVideoUrl]);
  const youtubeId = useMemo(() => parseYouTubeId(activeVideoUrl), [activeVideoUrl]);
  const initialPreferences = useMemo(() => readPlayerPreferences(), []);
  const mergedMarkers = useMemo(
    () => mergeChapterMarkers(bookmarks, chapterMarkers),
    [bookmarks, chapterMarkers]
  );
  const normalizedQualitySources = useMemo(
    () =>
      [...qualitySources]
        .map((source) => ({
          id: source.id,
          height: source.height ?? 0,
          label: source.label,
          src: source.src,
        }))
        .sort((left, right) => right.height - left.height),
    [qualitySources]
  );
  const allowAutoQuality = shouldUseHls(activeVideoUrl, provider);
  const storageKey = useMemo(
    () => `course-video-progress:${courseId}:${lessonId}`,
    [courseId, lessonId]
  );

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRuntimeRef = useRef<YouTubeRuntimePlayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hlsRetryTimeoutRef = useRef<number | null>(null);
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const lastTapRef = useRef<{ timestamp: number; x: number } | null>(null);
  const pendingSourceSwitchRef = useRef<{
    time: number;
    shouldResume: boolean;
  } | null>(null);
  const autoCompleteTriggeredRef = useRef(alreadyCompleted);
  const lastSaveTimeRef = useRef(0);
  const hlsRetryStateRef = useRef({ network: 0, media: 0 });

  const [notes, setNotes] = useState<TimelineNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [notesFreeformContent, setNotesFreeformContent] = useState("");
  const [isNotesSyncing, setIsNotesSyncing] = useState(false);
  const [thumbnailCues, setThumbnailCues] = useState<
    ReturnType<typeof parseThumbnailVtt>
  >([]);
  const [youtubePlaybackRates, setYoutubePlaybackRates] = useState<number[]>([]);

  const setPlayerState = useCourseVideoPlayerStore((state) => state.setPlayerState);
  const resetPlayerState = useCourseVideoPlayerStore(
    (state) => state.resetPlayerState
  );
  const {
    volume,
    isMuted,
    playbackRate,
    isAmbientMode,
    brightness,
    watermarkIndex,
    isFullscreen,
    selectedSubtitle,
    isPlaying,
    autoplayCountdown,
    isEnded,
    qualities,
  } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      volume: state.volume,
      isMuted: state.isMuted,
      playbackRate: state.playbackRate,
      isAmbientMode: state.isAmbientMode,
      brightness: state.brightness,
      watermarkIndex: state.watermarkIndex,
      isFullscreen: state.isFullscreen,
      selectedSubtitle: state.selectedSubtitle,
      isPlaying: state.isPlaying,
      autoplayCountdown: state.autoplayCountdown,
      isEnded: state.isEnded,
      qualities: state.qualities,
    }))
  );

  const selectedSubtitleLabel =
    selectedSubtitle === "off"
      ? "بدون ترجمة"
      : subtitleTracks.find((track) => track.id === selectedSubtitle)?.label ??
      "ترجمة";
  const sidebarHasContent =
    mergedMarkers.length > 0 || notes.length > 0 || lessons.length > 0;
  const playbackRates =
    provider === "youtube" && youtubePlaybackRates.length > 0
      ? [...new Set([...youtubePlaybackRates, ...PLAYBACK_RATES])].sort(
        (left, right) => left - right
      )
      : PLAYBACK_RATES;

  const getAdapter = useCallback((): PlayerAdapter | null => {
    if (provider === "youtube") {
      const player = youtubePlayerRuntimeRef.current;
      if (!player) return null;

      return {
        canUsePip: false,
        getBuffered: () => 0,
        getCurrentTime: () => player.getCurrentTime() || 0,
        getDuration: () => player.getDuration() || 0,
        pause: () => player.pauseVideo(),
        play: async () => {
          player.playVideo();
        },
        seekTo: (seconds) => player.seekTo(seconds, true),
        setMuted: (muted) => {
          if (muted) {
            player.mute();
          } else {
            player.unMute();
          }
        },
        setPlaybackRate: (rate) => {
          player.setPlaybackRate(rate);
        },
        setVolume: (nextVolume) => {
          player.setVolume(Math.round(nextVolume * 100));
        },
      };
    }

    const video = videoRef.current;
    if (!video) return null;

    return {
      canUsePip:
        Boolean(document.pictureInPictureEnabled) &&
        typeof video.requestPictureInPicture === "function",
      getBuffered: () =>
        video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      pause: () => video.pause(),
      play: () => video.play(),
      seekTo: (seconds) => {
        video.currentTime = seconds;
      },
      setMuted: (muted) => {
        video.muted = muted;
      },
      setPlaybackRate: (rate) => {
        video.playbackRate = rate;
      },
      setVolume: (nextVolume) => {
        video.volume = nextVolume;
      },
    };
  }, [provider, youtubePlayerRuntimeRef]);

  const flashFeedback = useCallback(
    (feedback: NonNullable<PlayerFeedback>) => {
      setPlayerState({ feedback });
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setPlayerState({ feedback: null });
      }, 850);
    },
    [setPlayerState]
  );

  const resetControlsTimeout = useCallback(() => {
    setPlayerState({ showControls: true });
    if (playerContainerRef.current) {
      playerContainerRef.current.style.cursor = "default";
    }

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = window.setTimeout(() => {
      const store = useCourseVideoPlayerStore.getState();
      if (
        store.isPlaying &&
        !store.isSettingsOpen &&
        !store.isSidebarOpen &&
        !store.isHelpOpen &&
        !store.isStatsOpen
      ) {
        setPlayerState({ showControls: false });
        if (playerContainerRef.current) {
          playerContainerRef.current.style.cursor = "none";
        }
      }
    }, CONTROLS_HIDE_TIMEOUT_MS);
  }, [setPlayerState]);

  const triggerAutoComplete = useCallback(() => {
    if (autoCompleteTriggeredRef.current) return;
    autoCompleteTriggeredRef.current = true;
    onLessonAutoComplete?.();
  }, [onLessonAutoComplete]);

  const syncProgressToServer = useCallback(
    (positionSeconds: number) => {
      if (!Number.isFinite(positionSeconds)) return;

      void fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [lessonId]
  );

  const saveProgress = useCallback(
    (force = false) => {
      const adapter = getAdapter();
      if (!adapter) return;

      const nextDuration = adapter.getDuration();
      if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastSaveTimeRef.current < PROGRESS_SAVE_INTERVAL_MS) {
        return;
      }

      const nextCurrentTime = clamp(adapter.getCurrentTime(), 0, nextDuration);
      const percent = (nextCurrentTime / nextDuration) * 100;
      const payload: StoredVideoProgress = {
        currentTime: nextCurrentTime,
        duration: nextDuration,
        percent,
        updatedAt: now,
        completed: percent >= AUTO_COMPLETE_PERCENT,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        return;
      }

      lastSaveTimeRef.current = now;
      syncProgressToServer(Math.round(nextCurrentTime));
    },
    [getAdapter, storageKey, syncProgressToServer]
  );

  const syncPlaybackSnapshot = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;

    const nextCurrentTime = adapter.getCurrentTime();
    const nextDuration = adapter.getDuration();
    const nextBuffered = adapter.getBuffered();

    setPlayerState({
      currentTime: nextCurrentTime,
      duration: nextDuration,
      buffered: nextBuffered,
    });

    if (
      nextDuration > 0 &&
      (nextCurrentTime / nextDuration) * 100 >= AUTO_COMPLETE_PERCENT
    ) {
      triggerAutoComplete();
    }
  }, [getAdapter, setPlayerState, triggerAutoComplete]);

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
      animationFrameRef.current = window.requestAnimationFrame(runPlaybackLoop);
    } else {
      animationFrameRef.current = null;
    }
  }, [saveProgress, syncPlaybackSnapshot]);

  const startPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = window.requestAnimationFrame(runPlaybackLoop);
    }
  }, [runPlaybackLoop]);

  const persistCloudNotes = useCallback(
    async (nextNotes: TimelineNote[], freeformContent = notesFreeformContent) => {
      try {
        setIsNotesSyncing(true);
        const content = serializeCloudTimelineNotes(freeformContent, nextNotes);
        const response = await fetch(`/api/courses/lessons/${lessonId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error("Failed to save notes.");
        }
      } catch {
        setPlayerState({
          errorMessage: "تعذر مزامنة الملاحظات السحابية لهذا الدرس.",
        });
      } finally {
        setIsNotesSyncing(false);
      }
    },
    [lessonId, notesFreeformContent, setPlayerState]
  );

  const loadResumeData = useCallback(async () => {
    const adapter = getAdapter();
    if (!adapter) return;

    const nextDuration = adapter.getDuration();
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;

    let resumeCandidate = readStoredProgress(storageKey)?.currentTime ?? null;
    let latestTimestamp = readStoredProgress(storageKey)?.updatedAt ?? 0;

    try {
      const response = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        cache: "no-store",
      });

      if (response.ok) {
        const payload = await response.json();
        const data = (payload.data ?? payload) as {
          lastVideoPosition?: number;
          updatedAt?: string;
        };
        const serverPosition =
          typeof data.lastVideoPosition === "number" ? data.lastVideoPosition : null;
        const serverUpdatedAt = data.updatedAt
          ? new Date(data.updatedAt).getTime()
          : 0;

        if (
          serverPosition !== null &&
          serverPosition > 0 &&
          serverUpdatedAt >= latestTimestamp
        ) {
          resumeCandidate = serverPosition;
          latestTimestamp = serverUpdatedAt;
        }
      }
    } catch {
      return;
    }

    if (
      resumeCandidate !== null &&
      resumeCandidate > MIN_RESUME_TIME_SECONDS &&
      resumeCandidate < nextDuration - MIN_RESUME_TIME_SECONDS
    ) {
      setPlayerState({ resumeTime: resumeCandidate });
    }
  }, [getAdapter, lessonId, setPlayerState, storageKey]);

  const applySubtitleSelection = useCallback(
    (subtitleId: string) => {
      if (provider === "youtube") return;

      const video = videoRef.current;
      if (!video) return;

      Array.from(video.textTracks).forEach((track, index) => {
        const currentTrack = subtitleTracks[index];
        track.mode =
          subtitleId !== "off" && currentTrack?.id === subtitleId
            ? "showing"
            : "disabled";
      });
    },
    [provider, subtitleTracks]
  );

  const handleSeek = useCallback(
    (value: number) => {
      const adapter = getAdapter();
      if (!adapter) return;

      const nextDuration = adapter.getDuration();
      if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;

      const nextTime = clamp(value, 0, nextDuration);
      adapter.seekTo(nextTime);
      setPlayerState({ currentTime: nextTime, resumeTime: null, isEnded: false });
      syncPlaybackSnapshot();
      resetControlsTimeout();
    },
    [getAdapter, resetControlsTimeout, setPlayerState, syncPlaybackSnapshot]
  );

  const seekBy = useCallback(
    (seconds: number) => {
      const adapter = getAdapter();
      if (!adapter) return;

      const nextDuration = adapter.getDuration();
      if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;

      const nextTime = clamp(adapter.getCurrentTime() + seconds, 0, nextDuration);
      adapter.seekTo(nextTime);
      setPlayerState({ currentTime: nextTime });
      syncPlaybackSnapshot();
      flashFeedback({
        icon: seconds > 0 ? SkipForward : SkipBack,
        label: `${Math.abs(seconds)} ث`,
      });
      resetControlsTimeout();
    },
    [flashFeedback, getAdapter, resetControlsTimeout, setPlayerState, syncPlaybackSnapshot]
  );

  const togglePlayPause = useCallback(async () => {
    const adapter = getAdapter();
    if (!adapter) return;

    try {
      if (useCourseVideoPlayerStore.getState().isPlaying) {
        adapter.pause();
        flashFeedback({ icon: Settings2, label: "إيقاف مؤقت" });
      } else {
        await adapter.play();
        flashFeedback({ icon: Settings2, label: "تشغيل" });
      }
    } catch {
      setPlayerState({ errorMessage: "تعذر تشغيل الفيديو الحالي." });
    }

    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setPlayerState]);

  const toggleMute = useCallback(() => {
    const adapter = getAdapter();
    if (!adapter) return;

    const nextMuted = !useCourseVideoPlayerStore.getState().isMuted;
    adapter.setMuted(nextMuted);
    if (!nextMuted && useCourseVideoPlayerStore.getState().volume === 0) {
      adapter.setVolume(0.5);
      setPlayerState({ volume: 0.5 });
    }

    setPlayerState({ isMuted: nextMuted });
    flashFeedback({
      icon: nextMuted ? Volume2 : Volume2,
      label: nextMuted ? "كتم" : "صوت",
    });
    resetControlsTimeout();
  }, [flashFeedback, getAdapter, resetControlsTimeout, setPlayerState]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      const adapter = getAdapter();
      if (!adapter) return;

      const safeVolume = clamp(nextVolume, 0, 1);
      adapter.setVolume(safeVolume);
      adapter.setMuted(safeVolume === 0);
      setPlayerState({ volume: safeVolume, isMuted: safeVolume === 0 });
      resetControlsTimeout();
    },
    [getAdapter, resetControlsTimeout, setPlayerState]
  );

  const handlePlaybackRateChange = useCallback(
    (nextRate: number) => {
      const adapter = getAdapter();
      if (!adapter) return;

      if (provider === "youtube" && youtubePlaybackRates.length > 0) {
        const supportedRates = youtubePlaybackRates;
        if (!supportedRates.includes(nextRate)) {
          flashFeedback({
            icon: Settings2,
            label: `هذه السرعة غير مدعومة على YouTube`,
          });
          return;
        }
      }

      adapter.setPlaybackRate(nextRate);
      setPlayerState({ playbackRate: nextRate });
      flashFeedback({ icon: Settings2, label: `${nextRate}x` });
      resetControlsTimeout();
    },
    [
      flashFeedback,
      getAdapter,
      provider,
      resetControlsTimeout,
      setPlayerState,
      youtubePlaybackRates,
    ]
  );

  const changeSubtitle = useCallback(
    (subtitleId: string) => {
      applySubtitleSelection(subtitleId);
      setPlayerState({ selectedSubtitle: subtitleId });
      flashFeedback({
        icon: Settings2,
        label:
          subtitleId === "off"
            ? "الترجمة متوقفة"
            : subtitleTracks.find((track) => track.id === subtitleId)?.label ??
            "ترجمة",
      });
    },
    [applySubtitleSelection, flashFeedback, setPlayerState, subtitleTracks]
  );

  const changeQuality = useCallback(
    (qualityId: number) => {
      const hls = hlsRef.current;
      if (hls) {

        hls.currentLevel = qualityId;
        setPlayerState({ selectedQuality: qualityId });
        flashFeedback({
          icon: Settings2,
          label:
            qualityId === -1
              ? `تلقائي${useCourseVideoPlayerStore.getState().currentAutoQuality ? ` (${useCourseVideoPlayerStore.getState().currentAutoQuality}p)` : ""}`
              : `${useCourseVideoPlayerStore
                .getState()
                .qualities.find((quality: QualityOption) => quality.id === qualityId)?.label ?? "Quality"}`,
        });
        return;
      }

      const manualSource = normalizedQualitySources.find(
        (quality) => quality.id === qualityId
      );
      if (!manualSource) return;

      const adapter = getAdapter();
      pendingSourceSwitchRef.current = {
        time: adapter?.getCurrentTime() ?? 0,
        shouldResume: useCourseVideoPlayerStore.getState().isPlaying,
      };
      setPlayerState({
        selectedQuality: qualityId,
        currentAutoQuality: null,
        isLoading: true,
      });
      setActiveVideoUrl(manualSource.src);
      flashFeedback({
        icon: Settings2,
        label: manualSource.label,
      });
    },
    [flashFeedback, getAdapter, normalizedQualitySources, setPlayerState]
  );

  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      setPlayerState({ errorMessage: "تعذر تفعيل وضع ملء الشاشة." });
    }

    resetControlsTimeout();
  }, [resetControlsTimeout, setPlayerState]);

  const togglePip = useCallback(async () => {
    const adapter = getAdapter();
    if (!adapter || !adapter.canUsePip || provider === "youtube") {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPlayerState({ isPip: false });
      } else {
        await video.requestPictureInPicture();
        setPlayerState({ isPip: true });
      }
    } catch {
      setPlayerState({ errorMessage: "وضع النافذة العائمة غير متاح لهذا المتصفح." });
    }

    resetControlsTimeout();
  }, [getAdapter, provider, resetControlsTimeout, setPlayerState]);

  const restartPlayback = useCallback(() => {
    handleSeek(0);
    void getAdapter()?.play();
    flashFeedback({ icon: Settings2, label: "إعادة التشغيل" });
  }, [flashFeedback, getAdapter, handleSeek]);

  const copyLessonLink = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      flashFeedback({ icon: Settings2, label: "تم نسخ الرابط" });
    } catch {
      setPlayerState({ errorMessage: "تعذر نسخ رابط الدرس." });
    }
  }, [flashFeedback, setPlayerState]);

  const addNoteAtCurrentTime = useCallback(() => {
    const text = noteDraft.trim();
    if (!text) return;

    const nextNote = createTimelineNote(
      useCourseVideoPlayerStore.getState().currentTime,
      text
    );
    setNotes((current) => {
      const nextNotes = [...current, nextNote].sort((left, right) => left.time - right.time);
      void persistCloudNotes(nextNotes);
      return nextNotes;
    });
    setNoteDraft("");
    setPlayerState({ sidebarTab: "notes", isSidebarOpen: true });
    flashFeedback({ icon: Clock3, label: "تمت إضافة الملاحظة" });
  }, [flashFeedback, noteDraft, persistCloudNotes, setPlayerState]);

  const removeNote = useCallback(
    (noteId: string) => {
      setNotes((current) => {
        const nextNotes = current.filter((note) => note.id !== noteId);
        void persistCloudNotes(nextNotes);
        return nextNotes;
      });
    },
    [persistCloudNotes]
  );

  const insertTimestamp = useCallback(() => {
    setNoteDraft(
      (current) =>
        `${current}${current ? "\n" : ""}${formatSecondsToTimestamp(useCourseVideoPlayerStore.getState().currentTime)} `
    );
  }, []);

  const jumpToTime = useCallback(
    (seconds: number) => {
      handleSeek(seconds);
      void getAdapter()?.play();
    },
    [getAdapter, handleSeek]
  );

  const setOpenPanel = useCallback(
    (panel: "settings" | "help" | "stats" | "sidebar" | null) => {
      setPlayerState({
        isSettingsOpen: panel === "settings",
        isHelpOpen: panel === "help",
        isStatsOpen: panel === "stats",
        isSidebarOpen: panel === "sidebar",
      });
      resetControlsTimeout();
    },
    [resetControlsTimeout, setPlayerState]
  );

  const handleKeyboardShortcuts = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          void togglePlayPause();
          break;
        case "arrowright":
        case "l":
          event.preventDefault();
          seekBy(SEEK_STEP_SECONDS);
          break;
        case "arrowleft":
        case "j":
          event.preventDefault();
          seekBy(-SEEK_STEP_SECONDS);
          break;
        case "arrowup":
          event.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case "arrowdown":
          event.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case "m":
          event.preventDefault();
          toggleMute();
          break;
        case "f":
          event.preventDefault();
          void toggleFullscreen();
          break;
        case "p":
          event.preventDefault();
          void togglePip();
          break;
        case "t":
          event.preventDefault();
          onToggleTheater?.();
          break;
        case "c":
          event.preventDefault();
          changeSubtitle(
            selectedSubtitle === "off" && subtitleTracks[0]
              ? subtitleTracks[0].id
              : "off"
          );
          break;
        case "n":
          event.preventDefault();
          setPlayerState({ sidebarTab: "notes", isSidebarOpen: true });
          break;
        case "?":
          event.preventDefault();
          setPlayerState({ isHelpOpen: true });
          break;
        default:
          break;
      }
    },
    [
      changeSubtitle,
      handleVolumeChange,
      onToggleTheater,
      seekBy,
      selectedSubtitle,
      setPlayerState,
      subtitleTracks,
      toggleFullscreen,
      toggleMute,
      togglePip,
      togglePlayPause,
      volume,
    ]
  );

  const handleSurfaceTap = useCallback(
    async (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.detail === 2) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const xRatio = (event.clientX - bounds.left) / bounds.width;
        if (xRatio >= 0.66) {
          seekBy(SEEK_STEP_SECONDS);
          return;
        }
        if (xRatio <= 0.34) {
          seekBy(-SEEK_STEP_SECONDS);
          return;
        }
      }

      await togglePlayPause();
    },
    [seekBy, togglePlayPause]
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
    },
    [brightness, seekBy, volume]
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

      if (deltaY <= deltaX) {
        return;
      }

      gesture.moved = true;
      event.preventDefault();

      if (gesture.mode === "volume") {
        handleVolumeChange(gesture.startValue + deltaYRatio);
      } else if (gesture.mode === "brightness") {
        setPlayerState({ brightness: clamp(gesture.startValue + deltaYRatio, 0.6, 1.3) });
      }
    },
    [handleVolumeChange, setPlayerState]
  );

  const handleTouchEnd = useCallback(() => {
    const gesture = touchGestureRef.current;
    if (!gesture?.moved) {
      touchGestureRef.current = null;
      return;
    }

    if (gesture.mode === "volume") {
      flashFeedback({
        icon: Volume2,
        label: `الصوت ${Math.round(useCourseVideoPlayerStore.getState().volume * 100)}%`,
      });
    } else if (gesture.mode === "brightness") {
      flashFeedback({
        icon: SunMedium,
        label: `السطوع ${Math.round(useCourseVideoPlayerStore.getState().brightness * 100)}%`,
      });
    }

    touchGestureRef.current = null;
  }, [flashFeedback]);

  useEffect(() => {
    setActiveVideoUrl(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    autoCompleteTriggeredRef.current = alreadyCompleted;
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
    setThumbnailCues([]);
    setNoteDraft("");
  }, [alreadyCompleted, initialPreferences, resetPlayerState, lessonId]);

  useEffect(() => {
    if (normalizedQualitySources.length === 0 || provider === "youtube") {
      return;
    }

    const matchedQuality =
      normalizedQualitySources.find((quality) => quality.src === activeVideoUrl) ??
      normalizedQualitySources[0];

    setPlayerState({
      qualities: normalizedQualitySources.map(({ id, height, label }) => ({
        id,
        height,
        label,
      })),
      selectedQuality: matchedQuality?.id ?? -1,
      currentAutoQuality: null,
    });
  }, [activeVideoUrl, normalizedQualitySources, provider, setPlayerState]);

  useEffect(() => {
    try {
      const preferences: PlayerPreferences & { isSidebarOpen?: boolean; sidebarTab?: string } = {
        volume,
        isMuted,
        playbackRate,
        isAmbientMode,
        selectedSubtitle,
        brightness,
        isSidebarOpen: useCourseVideoPlayerStore.getState().isSidebarOpen,
        sidebarTab: useCourseVideoPlayerStore.getState().sidebarTab,
      };
      localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      return;
    }
  }, [brightness, isAmbientMode, isMuted, playbackRate, selectedSubtitle, volume]);

  useEffect(() => {
    if (!thumbnailVttUrl) {
      setThumbnailCues([]);
      return;
    }

    let isCancelled = false;
    void fetch(thumbnailVttUrl, { cache: "force-cache" })
      .then((response) => (response.ok ? response.text() : ""))
      .then((content) => {
        if (!isCancelled && content) {
          setThumbnailCues(parseThumbnailVtt(content, thumbnailVttUrl));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setThumbnailCues([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [thumbnailVttUrl]);

  useEffect(() => {
    let isCancelled = false;
    setIsNotesSyncing(true);
    void fetch(`/api/courses/lessons/${lessonId}/notes`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (isCancelled) return;
        const content = payload?.data?.content ?? "";
        const parsed = parseCloudTimelineNotes(content);
        setNotes(parsed.notes);
        setNotesFreeformContent(parsed.freeformContent);
      })
      .catch(() => {
        if (!isCancelled) {
          setNotes([]);
          setNotesFreeformContent("");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsNotesSyncing(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    if (!playerApiRef) return;

    playerApiRef.current = {
      getCurrentTime: () => getAdapter()?.getCurrentTime() ?? 0,
      seekTo: (time: number) => handleSeek(time),
      play: () => {
        void getAdapter()?.play();
      },
      pause: () => {
        getAdapter()?.pause();
      },
    } satisfies CourseVideoPlayerApi;

    return () => {
      if (playerApiRef.current) {
        playerApiRef.current = null;
      }
    };
  }, [getAdapter, handleSeek, playerApiRef]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setPlayerState({ isFullscreen: Boolean(document.fullscreenElement) });
    };

    const onPictureInPictureChange = () => {
      setPlayerState({ isPip: Boolean(document.pictureInPictureElement) });
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("enterpictureinpicture", onPictureInPictureChange);
    document.addEventListener("leavepictureinpicture", onPictureInPictureChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "enterpictureinpicture",
        onPictureInPictureChange
      );
      document.removeEventListener(
        "leavepictureinpicture",
        onPictureInPictureChange
      );
    };
  }, [setPlayerState]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlayerState((state) => ({
        watermarkIndex: (state.watermarkIndex + 1) % WATERMARK_POSITIONS.length,
      }));
    }, 12000);

    return () => {
      window.clearInterval(interval);
    };
  }, [setPlayerState]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setPlayerState((state) => ({ watchSeconds: state.watchSeconds + 1 }));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPlaying, setPlayerState]);

  useEffect(() => {
    const onPageHide = () => saveProgress(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || provider === "youtube") return;

    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;
  }, [isMuted, playbackRate, provider, volume]);

  useEffect(() => {
    if (provider === "youtube") return;

    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setPlayerState({ isLoading: false, duration: video.duration || 0 });
      if (pendingSourceSwitchRef.current) {
        const pendingSwitch = pendingSourceSwitchRef.current;
        pendingSourceSwitchRef.current = null;
        video.currentTime = clamp(
          pendingSwitch.time,
          0,
          Math.max(0, (video.duration || 0) - 0.5)
        );
        syncPlaybackSnapshot();
        if (pendingSwitch.shouldResume) {
          void video.play();
        }
        return;
      }

      syncPlaybackSnapshot();
      void loadResumeData();
    };
    const onDurationChange = () => {
      setPlayerState({ duration: video.duration || 0 });
    };
    const onProgress = () => {
      syncPlaybackSnapshot();
    };
    const onPlay = () => {
      setPlayerState({ isPlaying: true, isEnded: false, isLoading: false });
      resetControlsTimeout();
      startPlaybackLoop();
    };
    const onPause = () => {
      setPlayerState({ isPlaying: false, showControls: true });
      stopPlaybackLoop();
      syncPlaybackSnapshot();
      saveProgress(true);
    };
    const onWaiting = () => {
      setPlayerState({ isLoading: true });
    };
    const onPlaying = () => {
      setPlayerState({ isLoading: false });
    };
    const onEnded = () => {
      stopPlaybackLoop();
      syncPlaybackSnapshot();
      setPlayerState({
        isPlaying: false,
        isEnded: true,
        autoplayCountdown: AUTOPLAY_NEXT_SECONDS,
      });
      triggerAutoComplete();
      saveProgress(true);
    };
    const onVolumeChange = () => {
      setPlayerState({ volume: video.volume, isMuted: video.muted });
    };
    const onRateChange = () => {
      setPlayerState({ playbackRate: video.playbackRate });
    };
    const onError = () => {
      setPlayerState({
        errorMessage: "حدث خطأ أثناء تحميل الفيديو.",
        isLoading: false,
      });
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("error", onError);
    };
  }, [
    loadResumeData,
    provider,
    resetControlsTimeout,
    saveProgress,
    setPlayerState,
    startPlaybackLoop,
    stopPlaybackLoop,
    syncPlaybackSnapshot,
    triggerAutoComplete,
  ]);

  useEffect(() => {
    if (provider === "youtube") return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (hlsRetryTimeoutRef.current) {
      clearTimeout(hlsRetryTimeoutRef.current);
    }
    hlsRetryStateRef.current = { network: 0, media: 0 };

    if (!shouldUseHls(activeVideoUrl, provider)) {
      video.src = activeVideoUrl;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeVideoUrl;
      return;
    }

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
      const nextQualities = hls.levels
        .map((level, index) => ({
          id: index,
          height: level.height,
          label: level.height > 0 ? `${level.height}p` : `L${index + 1}`,
        }))
        .filter((level, index, array) => {
          return array.findIndex((item) => item.height === level.height) === index;
        })
        .sort((left, right) => right.height - left.height);

      setPlayerState({
        qualities: nextQualities,
        currentAutoQuality: hls.levels[hls.currentLevel]?.height ?? null,
        isLoading: false,
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      setPlayerState({
        currentAutoQuality: hls.levels[data.level]?.height ?? null,
      });
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;

      const retryState = hlsRetryStateRef.current;
      const lowerQuality = () => {
        if (hls.currentLevel > 0) {
          hls.currentLevel = hls.currentLevel - 1;
          setPlayerState({ selectedQuality: hls.currentLevel });
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
      hlsRef.current = null;
      setPlayerState({
        errorMessage: "تعذر تشغيل البث الحالي بعد عدة محاولات.",
        isLoading: false,
      });
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
      if (hlsRetryTimeoutRef.current) {
        clearTimeout(hlsRetryTimeoutRef.current);
      }
    };
  }, [activeVideoUrl, flashFeedback, provider, setPlayerState]);

  useEffect(() => {
    const nextSubtitleId =
      selectedSubtitle === "off" ||
        subtitleTracks.length === 0 ||
        !subtitleTracks.some((track) => track.id === selectedSubtitle)
        ? "off"
        : selectedSubtitle;

    applySubtitleSelection(nextSubtitleId);
  }, [applySubtitleSelection, selectedSubtitle, subtitleTracks]);

  useEffect(() => {
    if (!isEnded || !onNextVideo) return;
    if (autoplayCountdown <= 0) {
      onNextVideo();
      return;
    }

    const timer = window.setTimeout(() => {
      setPlayerState((state) => ({
        autoplayCountdown: state.autoplayCountdown - 1,
      }));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoplayCountdown, isEnded, onNextVideo, setPlayerState]);

  useEffect(() => {
    return () => {
      stopPlaybackLoop();
      saveProgress(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (hlsRetryTimeoutRef.current) {
        clearTimeout(hlsRetryTimeoutRef.current);
      }
    };
  }, [saveProgress, stopPlaybackLoop]);

  useYouTubePlayer({
    containerRef: youtubeContainerRef,
    enabled: provider === "youtube" && Boolean(youtubeId),
    videoId: youtubeId,
    volume,
    isMuted,
    playbackRate,
    playerRef: youtubePlayerRuntimeRef,
    onReady: (player) => {
      setPlayerState({
        isLoading: false,
        duration: player.getDuration() || 0,
      });
      setYoutubePlaybackRates(player.getAvailablePlaybackRates() ?? []);
      syncPlaybackSnapshot();
      void loadResumeData();
    },
    onStateChange: (state, player, api) => {
      switch (state) {
        case api.PlayerState.PLAYING:
          setPlayerState({ isPlaying: true, isEnded: false, isLoading: false });
          resetControlsTimeout();
          startPlaybackLoop();
          break;
        case api.PlayerState.PAUSED:
          setPlayerState({ isPlaying: false, showControls: true });
          stopPlaybackLoop();
          syncPlaybackSnapshot();
          saveProgress(true);
          break;
        case api.PlayerState.BUFFERING:
          setPlayerState({ isLoading: true });
          break;
        case api.PlayerState.ENDED:
          stopPlaybackLoop();
          syncPlaybackSnapshot();
          setPlayerState({
            isPlaying: false,
            isEnded: true,
            isLoading: false,
            autoplayCountdown: AUTOPLAY_NEXT_SECONDS,
          });
          triggerAutoComplete();
          saveProgress(true);
          break;
        case api.PlayerState.CUED:
          setPlayerState({
            isLoading: false,
            duration: player.getDuration() || 0,
          });
          break;
        default:
          break;
      }
    },
    onError: () => {
      setPlayerState({
        errorMessage: "تعذر تحميل فيديو YouTube الحالي.",
        isLoading: false,
      });
    },
  });

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
        isFullscreen && "rounded-none",
        className
      )}
    >
      {isAmbientMode ? (
        <div className="pointer-events-none absolute inset-[-12%] -z-0 opacity-80 blur-3xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),transparent_22%)]" />
        </div>
      ) : null}

      <div className="absolute inset-0" style={{ filter: `brightness(${brightness})` }}>
        {provider === "youtube" ? (
          <div
            ref={youtubeContainerRef}
            className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            playsInline
            preload="metadata"
          >
            {subtitleTracks.map((track) => (
              <track
                key={track.id}
                kind="subtitles"
                label={track.label}
                srcLang={track.language}
                src={track.src}
              />
            ))}
          </video>
        )}
      </div>

      <button
        type="button"
        aria-label="سطح المشغل"
        className="absolute inset-0 z-10 bg-transparent"
        onClick={(event) => void handleSurfaceTap(event)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div
        className={cn(
          "pointer-events-none absolute rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/50 backdrop-blur-md transition-all duration-1000",
          WATERMARK_POSITIONS[watermarkIndex]
        )}
      >
        {watermarkText}
      </div>

      <PlayerHeader
        provider={provider}
        lessonTitle={lessonTitle}
        alreadyCompleted={alreadyCompleted}
        onMarkComplete={triggerAutoComplete}
      />

      <PlayerOverlays
        onAcceptResume={() => {
          const resumeTime = useCourseVideoPlayerStore.getState().resumeTime;
          if (resumeTime === null) return;
          handleSeek(resumeTime);
          setPlayerState({ resumeTime: null });
          void getAdapter()?.play();
        }}
        onDismissResume={() => setPlayerState({ resumeTime: null })}
        onCancelAutoplay={() =>
          setPlayerState({ isEnded: false, autoplayCountdown: AUTOPLAY_NEXT_SECONDS })
        }
        onPlayNextNow={onNextVideo}
      />

      <PlayerControls
        markers={mergedMarkers}
        thumbnails={thumbnailCues}
        sidebarHasContent={sidebarHasContent}
        isTheaterMode={isTheaterMode}
        canUsePip={provider !== "youtube"}
        onSeek={handleSeek}
        onSeekBy={seekBy}
        onTogglePlayPause={() => void togglePlayPause()}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onOpenHelp={() => setPlayerState({ isHelpOpen: true })}
        onToggleTheater={() => onToggleTheater?.()}
        onTogglePip={() => void togglePip()}
        onToggleSidebar={() =>
          setPlayerState((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
        }
        onToggleFullscreen={() => void toggleFullscreen()}
        onToggleSettings={() =>
          setPlayerState((state) => ({
            isSettingsOpen: !state.isSettingsOpen,
            isStatsOpen: false,
          }))
        }
      />

      <PlayerPanels
        qualities={qualities}
        playbackRates={playbackRates}
        subtitleTracks={subtitleTracks}
        audioTracks={audioTracks}
        lessons={lessons}
        lessonId={lessonId}
        bookmarks={mergedMarkers}
        notes={notes}
        noteDraft={noteDraft}
        selectedSubtitleLabel={selectedSubtitleLabel}
        canCopyLink={typeof navigator !== "undefined" && Boolean(navigator.clipboard)}
        isNotesSyncing={isNotesSyncing}
        allowAutoQuality={allowAutoQuality}
        onCloseSettings={() => setPlayerState({ isSettingsOpen: false })}
        onChangeQuality={changeQuality}
        onChangePlaybackRate={handlePlaybackRateChange}
        onChangeSubtitle={changeSubtitle}
        onToggleAmbient={() => {
          setPlayerState((state) => ({ isAmbientMode: !state.isAmbientMode }));
          flashFeedback({
            icon: Sparkles,
            label: isAmbientMode ? "إيقاف الإضاءة" : "تفعيل الإضاءة",
          });
        }}
        onChangeBrightness={(nextBrightness) =>
          setPlayerState({ brightness: clamp(nextBrightness, 0.6, 1.3) })
        }
        onRestartPlayback={restartPlayback}
        onOpenStats={() => setOpenPanel("stats")}
        onCopyLessonLink={() => void copyLessonLink()}
        onCloseStats={() => setPlayerState({ isStatsOpen: false })}
        onCloseHelp={() => setPlayerState({ isHelpOpen: false })}
        onCloseSidebar={() => setPlayerState({ isSidebarOpen: false })}
        onToggleSidebarTab={(tab) => setPlayerState({ sidebarTab: tab })}
        onNoteDraftChange={setNoteDraft}
        onAddNoteAtCurrentTime={addNoteAtCurrentTime}
        onInsertTimestamp={insertTimestamp}
        onRemoveNote={removeNote}
        onJumpToTime={jumpToTime}
        onLessonChange={onLessonChange}
      />

      {!sidebarHasContent ? (
        <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-[22px] border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-white/55 backdrop-blur-lg lg:block">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            <span>الأدوات الجانبية ستتوسع تلقائيًا عند وجود معالم أو ملاحظات أو دروس.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(CourseVideoPlayer);

export type { CourseVideoPlayerApi, CourseVideoPlayerProps } from "./player/types";
