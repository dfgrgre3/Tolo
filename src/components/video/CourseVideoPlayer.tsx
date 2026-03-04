"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings2,
  RotateCcw,
  Gauge,
  Loader2,
  MonitorPlay,
  Youtube,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP_SECONDS = 10;
const AUTO_COMPLETE_PERCENT = 90;
const PROGRESS_SAVE_INTERVAL_MS = 4000;
const CONTROLS_HIDE_TIMEOUT_MS = 3000;

type VideoProvider = "youtube" | "bunny" | "cloudflare" | "html5" | "unknown";

type StoredVideoProgress = {
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: number;
  completed: boolean;
};

interface CourseVideoPlayerProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  alreadyCompleted?: boolean;
  onLessonAutoComplete?: () => void;
  className?: string;
}

function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ?? null;
    }

    if (host.includes("youtube.com")) {
      if (parsed.pathname.includes("/embed/")) {
        const parts = parsed.pathname.split("/embed/");
        if (parts[1]) {
          return parts[1].split("/")[0];
        }
      }

      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) {
        return fromQuery;
      }
    }
  } catch {
    // Fall through to regex fallback.
  }

  const regex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&#/]+)/i;
  const match = url.match(regex);
  return match?.[1] ?? null;
}

function getProvider(videoUrl: string): VideoProvider {
  if (!videoUrl) return "unknown";
  if (parseYouTubeId(videoUrl)) return "youtube";
  if (videoUrl.includes("bunnycdn.com") || videoUrl.includes("b-cdn.net")) return "bunny";
  if (videoUrl.includes("cloudflarestream.com")) return "cloudflare";
  return "html5";
}

function getYoutubeEmbedUrl(videoUrl: string): string {
  const id = parseYouTubeId(videoUrl);
  if (!id) return videoUrl;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=0&playsinline=1&controls=1`;
}

function getYoutubeWatchUrl(videoUrl: string): string | null {
  const id = parseYouTubeId(videoUrl);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CourseVideoPlayer({
  courseId,
  lessonId,
  lessonTitle,
  videoUrl,
  alreadyCompleted = false,
  onLessonAutoComplete,
  className,
}: CourseVideoPlayerProps) {
  const provider = useMemo(() => getProvider(videoUrl), [videoUrl]);
  const youtubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(videoUrl), [videoUrl]);
  const youtubeWatchUrl = useMemo(() => getYoutubeWatchUrl(videoUrl), [videoUrl]);
  const storageKey = useMemo(
    () => `course-video-progress:${courseId}:${lessonId}`,
    [courseId, lessonId]
  );

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoCompleteTriggeredRef = useRef<boolean>(alreadyCompleted);
  const lastSaveTimeRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"play" | "pause" | "seek-f" | "seek-b" | null>(null);
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const bufferedPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (buffered / duration) * 100));
  }, [buffered, duration]);

  const hasPictureInPictureSupport = useMemo(() => {
    if (provider !== "html5") return false;
    if (typeof document === "undefined") return false;
    return Boolean(document.pictureInPictureEnabled);
  }, [provider]);

  const hideControls = useCallback(() => {
    if (isPlaying && !isSettingsOpen) {
      setShowControls(false);
    }
  }, [isPlaying, isSettingsOpen]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(hideControls, CONTROLS_HIDE_TIMEOUT_MS);
  }, [hideControls]);

  const saveProgress = useCallback(
    (force = false) => {
      if (provider !== "html5") return;
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

      const now = Date.now();
      if (!force && now - lastSaveTimeRef.current < PROGRESS_SAVE_INTERVAL_MS) {
        return;
      }

      const percent = (video.currentTime / video.duration) * 100;
      const payload: StoredVideoProgress = {
        currentTime: video.currentTime,
        duration: video.duration,
        percent,
        updatedAt: now,
        completed: percent >= AUTO_COMPLETE_PERCENT,
      };

      localStorage.setItem(storageKey, JSON.stringify(payload));
      lastSaveTimeRef.current = now;
    },
    [provider, storageKey]
  );

  const triggerAutoComplete = useCallback(() => {
    if (autoCompleteTriggeredRef.current) return;
    autoCompleteTriggeredRef.current = true;
    onLessonAutoComplete?.();
  }, [onLessonAutoComplete]);

  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
        setLastAction("play");
      } else {
        video.pause();
        setLastAction("pause");
      }
      resetControlsTimeout();
    } catch {
      setErrorMessage("تعذر تشغيل الفيديو. تحقق من الرابط أو صيغة الملف.");
    }
  }, [resetControlsTimeout]);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const targetTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    setLastAction(seconds > 0 ? "seek-f" : "seek-b");
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleSeek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const normalized = Math.min(1, Math.max(0, nextVolume));
    video.volume = normalized;
    video.muted = normalized === 0;
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handlePlaybackRateChange = useCallback((nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    setIsSettingsOpen(false);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleFullscreen = useCallback(async () => {
    const element = playerContainerRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      // Ignore browser limitation errors.
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const pipVideo = video as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<PictureInPictureWindow>;
    };

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (pipVideo.requestPictureInPicture) {
        await pipVideo.requestPictureInPicture();
      }
    } catch {
      // Ignore browser limitation errors.
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  useEffect(() => {
    autoCompleteTriggeredRef.current = alreadyCompleted;
  }, [alreadyCompleted, lessonId]);

  useEffect(() => {
    if (provider !== "html5") return;

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const onEnterPictureInPicture = () => setIsPictureInPicture(true);
    const onLeavePictureInPicture = () => setIsPictureInPicture(false);

    document.addEventListener("fullscreenchange", onFullscreenChange);
    const video = videoRef.current;
    video?.addEventListener("enterpictureinpicture", onEnterPictureInPicture);
    video?.addEventListener("leavepictureinpicture", onLeavePictureInPicture);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      video?.removeEventListener("enterpictureinpicture", onEnterPictureInPicture);
      video?.removeEventListener("leavepictureinpicture", onLeavePictureInPicture);
    };
  }, [provider, lessonId]);

  useEffect(() => {
    return () => {
      saveProgress(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [saveProgress]);

  useEffect(() => {
    if (provider !== "html5") return;

    const handleBeforeUnload = () => {
      saveProgress(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [provider, saveProgress]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    setDuration(video.duration);
    setErrorMessage(null);
    setIsLoading(false);

    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) return;

    try {
      const saved: StoredVideoProgress = JSON.parse(savedRaw);
      const maxAllowedTime = Math.max(0, video.duration - 5);
      const canResume =
        Number.isFinite(saved.currentTime) &&
        saved.currentTime > 5 &&
        saved.currentTime < maxAllowedTime;

      if (canResume) {
        setResumeTime(saved.currentTime);
      }
    } catch {
      // Ignore malformed local storage value.
    }
  }, [storageKey]);

  const handleResume = useCallback(() => {
    const video = videoRef.current;
    if (video && resumeTime !== null) {
      video.currentTime = resumeTime;
      setCurrentTime(resumeTime);
      setResumeTime(null);
      void video.play();
    }
  }, [resumeTime]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = video.currentTime;
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;

    setCurrentTime(nextTime);
    if (nextDuration > 0 && nextDuration !== duration) {
      setDuration(nextDuration);
    }

    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }

    if (nextDuration > 0) {
      const watchedPercent = (nextTime / nextDuration) * 100;
      if (watchedPercent >= AUTO_COMPLETE_PERCENT) {
        triggerAutoComplete();
      }
    }

    saveProgress(false);
  }, [duration, saveProgress, triggerAutoComplete]);

  const onEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(duration);
    saveProgress(true);
    triggerAutoComplete();
    setShowControls(true);
  }, [duration, saveProgress, triggerAutoComplete]);

  const onKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      if (provider !== "html5") return;

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          await togglePlayPause();
          break;
        case "arrowleft":
          event.preventDefault();
          seekBy(-SEEK_STEP_SECONDS);
          break;
        case "arrowright":
          event.preventDefault();
          seekBy(SEEK_STEP_SECONDS);
          break;
        case "m":
          event.preventDefault();
          toggleMute();
          break;
        case "f":
          event.preventDefault();
          await toggleFullscreen();
          break;
        default:
          break;
      }
    },
    [provider, seekBy, toggleFullscreen, toggleMute, togglePlayPause]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (provider !== "html5") return;
    const rect = playerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    
    if (x < third) {
      seekBy(-SEEK_STEP_SECONDS);
    } else if (x > rect.width - third) {
      seekBy(SEEK_STEP_SECONDS);
    } else {
      void toggleFullscreen();
    }
  }, [provider, seekBy, toggleFullscreen]);

  // Handle action icons feedback
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 500);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  if (provider === "youtube") {
    return (
      <div className={cn("group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl transition-all duration-300 hover:border-blue-500/30", className)}>
        <div className="aspect-video">
          <iframe
            src={youtubeEmbedUrl}
            title={lessonTitle}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-3 text-xs text-slate-200">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
               <Youtube className="h-4 w-4" />
             </div>
             <div className="flex flex-col">
               <span className="text-[11px] font-bold text-white leading-none">YouTube Premium Player</span>
               <span className="text-[9px] text-white/40">المشغل التعليمي للطلاب</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {!alreadyCompleted && (
              <button
                type="button"
                onClick={triggerAutoComplete}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 transition-all hover:bg-emerald-500/20 hover:scale-105 active:scale-95"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                تحديد كمكتمل
              </button>
            )}
            {youtubeWatchUrl && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 border border-white/10 transition-all hover:bg-white/10 hover:text-white"
              >
                فتح في YouTube
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (provider !== "html5") {
    return (
      <div className={cn("aspect-video flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-200 shadow-xl", className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <ExternalLink className="h-8 w-8" />
        </div>
        <h3 className="mb-2 text-lg font-bold">تنسيق فيديو غير مدعوم حالياً</h3>
        <p className="mb-6 max-w-xs text-sm text-slate-400">لا يمكن تشغيل هذا النوع من الملفات في المشغل المدمج، يرجى فتحه مباشرة من المصدر.</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
        >
          فتح الرابط الأصلي
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && !isSettingsOpen && setShowControls(false)}
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 transition-all duration-500 group/player focus:outline-none focus:ring-2 focus:ring-blue-500/50",
        isFullscreen ? "rounded-none" : "",
        className
      )}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full cursor-pointer"
        playsInline
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={() => {
           if (isSettingsOpen) setIsSettingsOpen(false);
           else void togglePlayPause();
        }}
        onDoubleClick={handleDoubleClick}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (!video) return;
          setVolume(video.volume);
          setIsMuted(video.muted);
        }}
        onEnded={onEnded}
        onError={() => setErrorMessage("تعذر تحميل الفيديو. قد يكون هناك خلل في الاتصال أو الرابط.")}
      />

      {/* Action Indicators (Play/Pause/Seek visual feedback) */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20">
              {lastAction === "play" && <Play className="h-10 w-10 fill-current" />}
              {lastAction === "pause" && <Pause className="h-10 w-10 fill-current" />}
              {lastAction === "seek-f" && <SkipForward className="h-10 w-10 fill-current" />}
              {lastAction === "seek-b" && <SkipBack className="h-10 w-10 fill-current" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Spinner */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          >
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Prompt */}
      <AnimatePresence>
        {resumeTime !== null && showControls && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-24 right-6 left-6 z-50 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/80 p-4 text-white backdrop-blur-xl md:right-1/2 md:left-auto md:translate-x-1/2 md:w-80"
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">هل تريد الاستمرار؟</span>
                <span className="text-[11px] text-blue-200/70">توقفت عند {formatDuration(resumeTime)}</span>
              </div>
            </div>
            <div className="flex gap-2">
               <button 
                 onClick={() => setResumeTime(null)}
                 className="rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-white/10"
               >
                 تخطي
               </button>
               <button 
                 onClick={handleResume}
                 className="rounded-lg bg-blue-500 px-4 py-1.5 text-[11px] font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-400"
               >
                 استئناف
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      {errorMessage && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
           <div className="max-w-xs rounded-2xl bg-rose-950/90 p-6 text-center text-white ring-1 ring-rose-500/50">
             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
               <Settings2 className="h-6 w-6" />
             </div>
             <p className="mb-4 text-sm font-medium leading-relaxed">{errorMessage}</p>
             <button 
               onClick={() => window.location.reload()}
               className="rounded-full bg-white px-6 py-2 text-xs font-bold text-rose-950 hover:bg-rose-100"
             >
               تحديث الصفحة
             </button>
           </div>
        </div>
      )}

      {/* Main Controls Overlay */}
      <div className={cn(
        "absolute inset-0 flex flex-col justify-between transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Top Gradient */}
        <div className="h-24 w-full bg-gradient-to-b from-black/80 to-transparent p-6">
           <AnimatePresence>
             {showControls && (
               <motion.div 
                 initial={{ y: -10, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="flex items-center justify-between"
               >
                 <div className="flex items-center gap-3">
                   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30">
                     <MonitorPlay className="h-4 w-4" />
                   </div>
                   <h2 className="text-sm font-bold text-white shadow-black drop-shadow-md truncate max-w-[200px] md:max-w-md">{lessonTitle}</h2>
                 </div>
                 
                 {alreadyCompleted && (
                   <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                     <CheckCircle2 className="h-3.5 w-3.5" />
                     مكتمل
                   </div>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Center Grid (optional big buttons for touch/extra pro feel) */}
        {!isPlaying && !isLoading && !errorMessage && (
           <div 
             className="flex-1 flex items-center justify-center group/playbtn"
             onClick={togglePlayPause}
           >
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-blue-600/20 text-white backdrop-blur-sm border border-blue-400/30 shadow-2xl transition-all duration-300 group-hover/playbtn:scale-110 group-hover/playbtn:bg-blue-600/40">
                <Play className="h-8 w-8 fill-current ml-1" />
              </div>
           </div>
        )}
        {isPlaying && <div className="flex-1" onClick={togglePlayPause} />}

        {/* Bottom Controls */}
        <div className="bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pb-0 md:p-6 md:pb-4">
          
          {/* Progress Bar Container */}
          <div className="relative group/progress px-2 md:px-0">
            {/* Buffering bar backdrop */}
            <div className="relative h-1.5 w-full bg-white/20 rounded-full overflow-hidden transition-all duration-300 group-hover/progress:h-2.5">
               {/* Buffered indicator */}
               <div 
                 className="absolute inset-y-0 left-0 bg-white/20 transition-all"
                 style={{ width: `${bufferedPercent}%` }}
               />
               {/* Progress bar */}
               <motion.div 
                 className="absolute inset-y-0 left-0 bg-blue-500 z-10"
                 style={{ width: `${progressPercent}%` }}
               />
            </div>
            
            {/* Interactive Range Input (Invisible overlay) */}
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0)}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="absolute -top-1 left-0 w-full h-4 opacity-0 cursor-pointer z-50 md:-top-1.5 md:h-6"
              aria-label="شريط تقدم الفيديو"
            />
            
            {/* Current Point indicator */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all scale-0 group-hover/progress:scale-100"
              style={{ left: `${progressPercent}%` }}
            >
               <div className="h-4 w-4 rounded-full bg-white shadow-xl ring-4 ring-blue-500/50" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            {/* Left Section: Controls */}
            <div className="flex items-center gap-1 md:gap-4">
              <button
                onClick={() => seekBy(-SEEK_STEP_SECONDS)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
                title="إرجاع 10 ثوان"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-all hover:scale-110 active:scale-95 shadow-xl shadow-blue-500/20"
                title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              >
                {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
              </button>
              
              <button
                onClick={() => seekBy(SEEK_STEP_SECONDS)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
                title="تقديم 10 ثوان"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              <div className="hidden md:flex items-center gap-3">
                 <div className="group/volume relative flex items-center h-10">
                   <button 
                     onClick={toggleMute}
                     className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
                   >
                     {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                   </button>
                   
                   <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume:w-24 group-hover/volume:mx-2">
                     <input
                       type="range"
                       min={0}
                       max={1}
                       step={0.05}
                       value={isMuted ? 0 : volume}
                       onChange={(event) => handleVolumeChange(Number(event.target.value))}
                       className="h-1.5 w-24 cursor-pointer accent-white"
                     />
                   </div>
                 </div>
                 
                 <div className="text-[13px] font-bold tabular-nums text-white/90 tracking-wide">
                   <span className="text-white">{formatDuration(currentTime)}</span>
                   <span className="mx-1 text-white/40">/</span>
                   <span className="text-white/60">{formatDuration(duration)}</span>
                 </div>
              </div>
            </div>

            {/* Right Section: Settings/Fullscreen */}
            <div className="flex items-center gap-1 md:gap-3">
              
              {/* Mobile Time */}
              <div className="md:hidden text-[12px] font-bold tabular-nums text-white/80">
                {formatDuration(currentTime)}
              </div>

              {/* Settings Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10",
                    isSettingsOpen ? "bg-white/20 text-white rotate-90" : "text-white/80 hover:text-white"
                  )}
                  title="الإعدادات"
                >
                  <Settings2 className="h-5 w-5" />
                </button>

                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute bottom-14 left-0 md:left-auto md:right-0 w-52 overflow-hidden rounded-2xl bg-black/90 border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-[70]"
                    >
                      <div className="mb-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/40">سرعة التشغيل</div>
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRateChange(rate)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all hover:bg-white/10",
                            playbackRate === rate ? "text-blue-400 bg-blue-500/10 font-bold" : "text-white/70"
                          )}
                        >
                          <span className="flex items-center gap-2">
                             <Gauge className="h-4 w-4 opacity-50" />
                             {rate === 1 ? "عادية" : `${rate}x`}
                          </span>
                          {playbackRate === rate && <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {hasPictureInPictureSupport && (
                <button
                  onClick={togglePictureInPicture}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10",
                    isPictureInPicture ? "bg-blue-500 text-white" : "text-white/80 hover:text-white"
                  )}
                  title="صورة في صورة"
                >
                  <PictureInPicture2 className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white"
                title={isFullscreen ? "تصغير" : "ملء الشاشة"}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {/* Bottom Info Bar */}
          <div className="mt-2 flex items-center justify-between overflow-hidden">
             <motion.div 
               initial={false}
               animate={{ opacity: showControls ? 1 : 0 }}
               className="flex items-center gap-4 text-[11px] font-medium text-white/40"
             >
               <span className="flex items-center gap-1">
                 <kbd className="rounded border border-white/20 bg-white/5 py-0.5 px-1.5 text-[10px] text-white/60">Space</kbd>
                 للتشغيل
               </span>
               <span className="flex items-center gap-1">
                 <kbd className="rounded border border-white/20 bg-white/5 py-0.5 px-1.5 text-[10px] text-white/60">F</kbd>
                 للشاشة الكاملة
               </span>
             </motion.div>
             <div className="flex h-1 px-1 items-center gap-1 rounded-full bg-white/10">
                <div 
                  className="h-1 bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseVideoPlayer;

