"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, memo } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Constants ---
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP_SECONDS = 10;
const AUTO_COMPLETE_PERCENT = 90;
const PROGRESS_SAVE_INTERVAL_MS = 4000;
const CONTROLS_HIDE_TIMEOUT_MS = 3000;

// --- Types ---
type VideoProvider = "youtube" | "bunny" | "cloudflare" | "html5" | "unknown";
type StoredVideoProgress = {
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: number;
  completed: boolean;
};

export interface CourseVideoPlayerApi {
  getCurrentTime: () => number;
}

interface CourseVideoPlayerProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  alreadyCompleted?: boolean;
  onLessonAutoComplete?: () => void;
  onNextVideo?: () => void;
  playerApiRef?: React.MutableRefObject<CourseVideoPlayerApi | null>;
  className?: string;
}

// --- Utils ---
function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host.includes("youtube.com")) {
      if (parsed.pathname.includes("/embed/")) return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      const v = parsed.searchParams.get("v");
      if (v) return v;
    }
  } catch {}
  const regex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&#/]+)/i;
  return url.match(regex)?.[1] ?? null;
}

function getProvider(videoUrl: string): VideoProvider {
  if (!videoUrl) return "unknown";
  if (parseYouTubeId(videoUrl)) return "youtube";
  if (videoUrl.includes("bunnycdn.com") || videoUrl.includes("b-cdn.net")) return "bunny";
  if (videoUrl.includes("cloudflarestream.com")) return "cloudflare";
  return "html5";
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours > 0 
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// --- Sub-Components (Memoized for Performance) ---

const ProgressControl = memo(({ 
  videoRef, 
  duration, 
  buffered,
  onSeek 
}: { 
  videoRef: React.RefObject<HTMLVideoElement | null>, 
  duration: number, 
  buffered: number,
  onSeek: (val: number) => void 
}) => {
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setLocalTime(video.currentTime);
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, [videoRef]);

  const progressPercent = duration > 0 ? (localTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="relative group/progress px-2 md:px-0">
      <div className="relative h-1.5 w-full bg-white/20 rounded-full overflow-hidden transition-all duration-300 group-hover/progress:h-2.5">
        <div className="absolute inset-y-0 left-0 bg-white/20 transition-all" style={{ width: `${bufferedPercent}%` }} />
        <div className="absolute inset-y-0 left-0 bg-blue-500 z-10" style={{ width: `${progressPercent}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0)}
        step={0.1}
        value={localTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="absolute -top-1 left-0 w-full h-4 opacity-0 cursor-pointer z-50 md:-top-1.5 md:h-6"
      />
      <div className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all scale-0 group-hover/progress:scale-100" style={{ left: `${progressPercent}%` }}>
        <div className="h-4 w-4 rounded-full bg-white shadow-xl ring-4 ring-blue-500/50" />
      </div>
      <div className="mt-3 flex justify-between text-[13px] font-bold tabular-nums text-white/90">
         <div className="flex gap-1">
            <span className="text-white">{formatDuration(localTime)}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{formatDuration(duration)}</span>
         </div>
      </div>
    </div>
  );
});

ProgressControl.displayName = "ProgressControl";

const VolumeControl = memo(({ 
  volume, 
  isMuted, 
  onToggleMute, 
  onVolumeChange 
}: { 
  volume: number, 
  isMuted: boolean, 
  onToggleMute: () => void, 
  onVolumeChange: (val: number) => void 
}) => (
  <div className="group/volume relative flex items-center h-10">
    <button onClick={onToggleMute} className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white">
      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
    <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume:w-24 group-hover/volume:mx-2">
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={isMuted ? 0 : volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="h-1.5 w-24 cursor-pointer accent-white"
      />
    </div>
  </div>
));

VolumeControl.displayName = "VolumeControl";

// --- Main Player Component ---

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
}: CourseVideoPlayerProps) {
  const provider = useMemo(() => getProvider(videoUrl), [videoUrl]);
  const youtubeEmbedUrl = useMemo(() => parseYouTubeId(videoUrl) ? `https://www.youtube.com/embed/${parseYouTubeId(videoUrl)}?rel=0&modestbranding=1&autoplay=0&playsinline=1&controls=1` : videoUrl, [videoUrl]);
  const storageKey = useMemo(() => `course-video-progress:${courseId}:${lessonId}`, [courseId, lessonId]);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoCompleteTriggeredRef = useRef<boolean>(alreadyCompleted);
  const lastSaveTimeRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
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
  const [isEnded, setIsEnded] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(5);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const hideControls = useCallback(() => {
    if (isPlaying && !isSettingsOpen) setShowControls(false);
  }, [isPlaying, isSettingsOpen]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(hideControls, CONTROLS_HIDE_TIMEOUT_MS);
  }, [hideControls]);

  const saveProgress = useCallback((force = false) => {
    if (provider !== "html5") return;
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const now = Date.now();
    if (!force && now - lastSaveTimeRef.current < PROGRESS_SAVE_INTERVAL_MS) return;

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
  }, [provider, storageKey]);

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
      setErrorMessage("تعذر تشغيل الفيديو.");
    }
  }, [resetControlsTimeout]);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    setLastAction(seconds > 0 ? "seek-f" : "seek-b");
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleSeek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleVolumeChange = useCallback((v: number) => {
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setIsSettingsOpen(false);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleFullscreen = useCallback(async () => {
    const element = playerContainerRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {}
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current as any;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch {}
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Effects
  useEffect(() => {
    if (playerApiRef) playerApiRef.current = { getCurrentTime: () => videoRef.current?.currentTime || 0 };
  }, [playerApiRef]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEnded && onNextVideo && autoplayCountdown > 0) {
      timer = setTimeout(() => setAutoplayCountdown(c => c - 1), 1000);
    } else if (isEnded && onNextVideo && autoplayCountdown === 0) {
      onNextVideo();
      setIsEnded(false);
    }
    return () => clearTimeout(timer);
  }, [isEnded, autoplayCountdown, onNextVideo]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const updateTime = () => {
      if (!video) return;
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
      if (video.duration > 0 && (video.currentTime / video.duration) * 100 >= AUTO_COMPLETE_PERCENT) triggerAutoComplete();
      saveProgress();
    };
    video?.addEventListener('timeupdate', updateTime);
    return () => video?.removeEventListener('timeupdate', updateTime);
  }, [triggerAutoComplete, saveProgress]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsLoading(false);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { currentTime } = JSON.parse(saved);
      if (currentTime > 5 && currentTime < video.duration - 5) setResumeTime(currentTime);
    }
  }, [storageKey]);

  if (provider === "youtube") {
    return (
      <div className={cn("group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl", className)}>
        <div className="aspect-video">
          <iframe src={youtubeEmbedUrl} title={lessonTitle} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <div className="flex justify-between bg-slate-900 px-5 py-3 text-xs text-slate-200">
          <div className="flex items-center gap-3">
             <Youtube className="h-4 w-4 text-red-500" />
             <span className="font-bold">YouTube Player</span>
          </div>
          {!alreadyCompleted && (
            <button onClick={triggerAutoComplete} className="rounded-full bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-400 border border-emerald-500/20">
              تحديد كمكتمل
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " ") { e.preventDefault(); togglePlayPause(); }
        if (e.key === "f") { e.preventDefault(); toggleFullscreen(); }
      }}
      onMouseMove={resetControlsTimeout}
      className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 transition-all group/player", isFullscreen ? "rounded-none" : "", className)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full cursor-pointer"
        playsInline
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => { setIsPlaying(true); setIsEnded(false); }}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlayPause}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onVolumeChange={() => { if (videoRef.current) { setVolume(videoRef.current.volume); setIsMuted(videoRef.current.muted); } }}
        onEnded={() => { setIsPlaying(false); setIsEnded(true); triggerAutoComplete(); }}
        onError={() => setErrorMessage("خطأ في التحميل")}
      />

      {/* Overlays & Indicators */}
      <AnimatePresence>
        {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Loader2 className="h-12 w-12 animate-spin text-blue-500" /></div>}
        {resumeTime !== null && showControls && (
          <div className="absolute bottom-24 right-6 left-6 z-50 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/80 p-4 text-white backdrop-blur-xl md:w-80 md:mx-auto">
            <span className="text-sm font-bold">استكمال المشاهدة؟</span>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = resumeTime; setResumeTime(null); videoRef.current?.play(); }} className="rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-bold">استئناف</button>
          </div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className={cn("absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 p-4 transition-opacity duration-300", showControls ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <ProgressControl videoRef={videoRef} duration={duration} buffered={buffered} onSeek={handleSeek} />
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => seekBy(-10)}><SkipBack className="h-5 w-5 text-white" /></button>
            <button onClick={togglePlayPause} className="h-12 w-12 rounded-full bg-white flex items-center justify-center">{isPlaying ? <Pause className="h-6 w-6 text-black" /> : <Play className="h-6 w-6 text-black ml-1" />}</button>
            <button onClick={() => seekBy(10)}><SkipForward className="h-5 w-5 text-white" /></button>
            <VolumeControl volume={volume} isMuted={isMuted} onToggleMute={toggleMute} onVolumeChange={handleVolumeChange} />
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}><Settings2 className={cn("h-5 w-5 text-white transition-transform", isSettingsOpen && "rotate-90")} /></button>
            <button onClick={toggleFullscreen}>{isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}</button>
          </div>
        </div>

        {/* Speed Menu */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-20 left-4 w-40 rounded-xl bg-black/90 p-2 border border-white/10">
              {PLAYBACK_RATES.map(rate => (
                <button key={rate} onClick={() => handlePlaybackRateChange(rate)} className={cn("w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg", playbackRate === rate && "text-blue-400 font-bold")}>{rate}x</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(CourseVideoPlayer);
