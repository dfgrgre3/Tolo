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
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP_SECONDS = 10;
const AUTO_COMPLETE_PERCENT = 90;
const PROGRESS_SAVE_INTERVAL_MS = 4000;

type VideoProvider = "youtube" | "html5" | "unknown";

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
  return "html5";
}

function getYoutubeEmbedUrl(videoUrl: string): string {
  const id = parseYouTubeId(videoUrl);
  if (!id) return videoUrl;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=0&playsinline=1`;
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const hasPictureInPictureSupport = useMemo(() => {
    if (provider !== "html5") return false;
    if (typeof document === "undefined") return false;
    return Boolean(document.pictureInPictureEnabled);
  }, [provider]);

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
      } else {
        video.pause();
      }
    } catch {
      setErrorMessage("تعذر تشغيل الفيديو. تحقق من الرابط أو صيغة الملف.");
    }
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const targetTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, []);

  const handleSeek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const normalized = Math.min(1, Math.max(0, nextVolume));
    video.volume = normalized;
    video.muted = normalized === 0;
  }, []);

  const handlePlaybackRateChange = useCallback((nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, []);

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
  }, []);

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
  }, []);

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
        video.currentTime = saved.currentTime;
        setCurrentTime(saved.currentTime);
        setResumeMessage(`استئناف من ${formatDuration(saved.currentTime)}`);
      }
    } catch {
      // Ignore malformed local storage value.
    }
  }, [storageKey]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = video.currentTime;
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;

    setCurrentTime(nextTime);
    if (nextDuration > 0 && nextDuration !== duration) {
      setDuration(nextDuration);
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

  if (provider === "youtube") {
    return (
      <div className={cn("w-full", className)}>
        <div className="aspect-video bg-black">
          <iframe
            src={youtubeEmbedUrl}
            title={lessonTitle}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-xs text-slate-200">
          <span>مشغّل YouTube مدمج مع الدرس الحالي.</span>
          <div className="flex items-center gap-2">
            {!alreadyCompleted && (
              <button
                type="button"
                onClick={triggerAutoComplete}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/30"
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
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20"
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
      <div className={cn("aspect-video bg-slate-900 p-6 text-center text-slate-200", className)}>
        <p className="mb-4">تعذر تمييز نوع الفيديو الحالي.</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          فتح المصدر
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
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80",
        className
      )}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full"
        playsInline
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (!video) return;
          setVolume(video.volume);
          setIsMuted(video.muted);
        }}
        onEnded={onEnded}
        onError={() => setErrorMessage("تعذر تحميل الفيديو. تحقق من الرابط أو الصلاحيات.")}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {resumeMessage && (
        <div className="absolute left-4 top-4 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white">
          {resumeMessage}
        </div>
      )}

      {errorMessage && (
        <div className="absolute inset-x-4 top-4 rounded-md bg-rose-500/85 px-3 py-2 text-xs text-white">
          {errorMessage}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0)}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-blue-500"
          aria-label="شريط تقدم الفيديو"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seekBy(-SEEK_STEP_SECONDS)}
              className="rounded-md bg-white/15 p-2 hover:bg-white/25"
              aria-label="إرجاع 10 ثوان"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                void togglePlayPause();
              }}
              className="rounded-md bg-white/15 p-2 hover:bg-white/25"
              aria-label={isPlaying ? "إيقاف الفيديو مؤقتًا" : "تشغيل الفيديو"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => seekBy(SEEK_STEP_SECONDS)}
              className="rounded-md bg-white/15 p-2 hover:bg-white/25"
              aria-label="تقديم 10 ثوان"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <span className="text-xs tabular-nums text-white/85">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-md bg-white/15 p-2 hover:bg-white/25"
              aria-label={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(event) => handleVolumeChange(Number(event.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-blue-500"
              aria-label="مستوى الصوت"
            />

            <label className="rounded-md bg-white/15 px-2 py-1 text-xs">
              السرعة
              <select
                value={playbackRate}
                onChange={(event) => handlePlaybackRateChange(Number(event.target.value))}
                className="ms-2 rounded bg-transparent text-xs outline-none"
                aria-label="سرعة التشغيل"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate} className="text-black">
                    {rate}x
                  </option>
                ))}
              </select>
            </label>

            {hasPictureInPictureSupport && (
              <button
                type="button"
                onClick={() => {
                  void togglePictureInPicture();
                }}
                className={cn(
                  "rounded-md p-2 hover:bg-white/25",
                  isPictureInPicture ? "bg-blue-500/50" : "bg-white/15"
                )}
                aria-label="وضع صورة داخل صورة"
              >
                <PictureInPicture2 className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void toggleFullscreen();
              }}
              className="rounded-md bg-white/15 p-2 hover:bg-white/25"
              aria-label={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
          <span>Space/K تشغيل • ←/→ تقديم وإرجاع • M كتم • F ملء الشاشة</span>
          <span>{progressPercent.toFixed(0)}% مشاهدة</span>
        </div>
      </div>
    </div>
  );
}

export default CourseVideoPlayer;
