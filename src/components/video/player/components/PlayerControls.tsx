import {
  Camera,
  FileText,
  Keyboard,
  ListVideo,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Settings2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCourseVideoPlayerStore } from "../store";
import type { BookmarkItem, ThumbnailCue } from "../types";
import { formatDuration } from "../utils";
import { IconButton } from "./IconButton";
import { ProgressRail } from "./ProgressRail";
import { cn } from "@/lib/utils";
import { useEfficiencyMode } from "@/hooks";

export function PlayerControls({
  markers,
  thumbnails,
  sidebarHasContent,
  isTheaterMode,
  canUsePip,
  onSeek,
  onSeekBy,
  onTogglePlayPause,
  onToggleMute,
  onVolumeChange,
  onOpenHelp,
  onToggleTheater,
  onTogglePip,
  onToggleSidebar,
  onToggleFullscreen,
  onToggleSettings,
  onToggleLoop,
  onCaptureFrame,
}: {
  markers: BookmarkItem[];
  thumbnails: ThumbnailCue[];
  sidebarHasContent: boolean;
  isTheaterMode: boolean;
  canUsePip: boolean;
  onSeek: (value: number) => void;
  onSeekBy: (seconds: number) => void;
  onTogglePlayPause: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onOpenHelp: () => void;
  onToggleTheater: () => void;
  onTogglePip: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  onToggleSettings: () => void;
  onToggleLoop: () => void;
  onCaptureFrame: () => void;
}) {
  const {
    currentTime,
    duration,
    buffered,
    isPlaying,
    isMuted,
    volume,
    playbackRate,
    isPip,
    isFullscreen,
    isSettingsOpen,
    isSidebarOpen,
    showControls,
    loopStart,
    loopEnd,
  } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
      duration: state.duration,
      buffered: state.buffered,
      isPlaying: state.isPlaying,
      isMuted: state.isMuted,
      volume: state.volume,
      playbackRate: state.playbackRate,
      isPip: state.isPip,
      isFullscreen: state.isFullscreen,
      isSettingsOpen: state.isSettingsOpen,
      isSidebarOpen: state.isSidebarOpen,
      showControls: state.showControls,
      loopStart: state.loopStart,
      loopEnd: state.loopEnd,
    }))
  );

  const isEfficiencyMode = useEfficiencyMode();

  const hasCustomPlaybackRate = playbackRate !== 1;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-20",
        isEfficiencyMode ? "bg-black/80" : "bg-gradient-to-t from-black via-black/75 to-transparent transition-opacity duration-200",
        showControls ? "opacity-100" : "pointer-events-none opacity-0",
        "sm:px-4 sm:pb-4"
      )}
    >
      <ProgressRail
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        markers={markers}
        thumbnails={thumbnails}
        onSeek={onSeek}
      />

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton
              icon={SkipBack}
              label="رجوع 10 ثوان"
              onClick={() => onSeekBy(-10)}
            />
            <button
              type="button"
              onClick={onTogglePlayPause}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl transition hover:scale-[1.03]"
              aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="mr-0.5 h-6 w-6 fill-current" />
              )}
            </button>
            <IconButton
              icon={SkipForward}
              label="تقديم 10 ثوان"
              onClick={() => onSeekBy(10)}
            />

            <div className="group/volume flex items-center">
              <IconButton
                icon={isMuted || volume === 0 ? VolumeX : Volume2}
                label="الصوت"
                onClick={onToggleMute}
              />
              <div className="w-24 sm:w-0 sm:overflow-hidden sm:transition-all sm:duration-200 sm:group-hover/volume:mr-2 sm:group-hover/volume:w-28">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(event) => onVolumeChange(Number(event.target.value))}
                  aria-label="مستوى الصوت"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                />
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold tabular-nums text-white/75">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
            {hasCustomPlaybackRate ? (
              <div className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-100">
                {playbackRate}x
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-white/60 sm:text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 tabular-nums text-white/80 sm:hidden">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
            {hasCustomPlaybackRate ? (
              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-sky-100 sm:hidden">
                {playbackRate}x
              </span>
            ) : null}
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 lg:inline-flex">
              اضغط مرتين يمينًا أو يسارًا للتقديم السريع
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              icon={Keyboard}
              label="اختصارات لوحة المفاتيح"
              onClick={onOpenHelp}
            />
            <IconButton
              icon={Monitor}
              label="الوضع المسرحي"
              active={isTheaterMode}
              onClick={onToggleTheater}
              className="hidden sm:flex"
            />
            <IconButton
              icon={PictureInPicture2}
              label="نافذة عائمة"
              active={isPip}
              disabled={!canUsePip}
              onClick={onTogglePip}
              className="hidden sm:flex"
            />
            <IconButton
              icon={sidebarHasContent ? ListVideo : FileText}
              label={isSidebarOpen ? "إغلاق اللوحة الجانبية" : "فتح اللوحة الجانبية"}
              active={isSidebarOpen}
              onClick={onToggleSidebar}
            />
            <IconButton
              icon={Camera}
              label="التقاط لقطة شاشة"
              onClick={onCaptureFrame}
            />
            <IconButton
              icon={Repeat}
              label={(loopStart !== null && loopEnd !== null) ? "إيقاف التكرار" : "تكرار مقطع (A-B)"}
              active={loopStart !== null}
              onClick={onToggleLoop}
            />
            <IconButton
              icon={isFullscreen ? Minimize : Maximize}
              label={isFullscreen ? "الخروج من وضع ملء الشاشة" : "ملء الشاشة"}
              onClick={onToggleFullscreen}
            />
            <IconButton
              icon={Settings2}
              label={isSettingsOpen ? "إغلاق الإعدادات" : "الإعدادات"}
              active={isSettingsOpen}
              onClick={onToggleSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
