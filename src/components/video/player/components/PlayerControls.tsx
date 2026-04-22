import {
  FileText,
  Keyboard,
  ListVideo,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  PictureInPicture2,
  Play,
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
}) {
  const {
    currentTime,
    duration,
    buffered,
    isPlaying,
    isMuted,
    volume,
    isPip,
    isFullscreen,
    isSettingsOpen,
    isSidebarOpen,
    showControls,
  } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
      duration: state.duration,
      buffered: state.buffered,
      isPlaying: state.isPlaying,
      isMuted: state.isMuted,
      volume: state.volume,
      isPip: state.isPip,
      isFullscreen: state.isFullscreen,
      isSettingsOpen: state.isSettingsOpen,
      isSidebarOpen: state.isSidebarOpen,
      showControls: state.showControls,
    }))
  );

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-4 pt-20 transition-opacity duration-200",
        showControls ? "opacity-100" : "pointer-events-none opacity-0"
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
            <div className="w-0 overflow-hidden transition-all duration-200 group-hover/volume:mr-2 group-hover/volume:w-28">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                className="h-2 w-28 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
              />
            </div>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/75 sm:block">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </div>
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
            label="فتح اللوحة الجانبية"
            active={isSidebarOpen}
            onClick={onToggleSidebar}
          />
          <IconButton
            icon={isFullscreen ? Minimize : Maximize}
            label="ملء الشاشة"
            onClick={onToggleFullscreen}
          />
          <IconButton
            icon={Settings2}
            label="الإعدادات"
            active={isSettingsOpen}
            onClick={onToggleSettings}
          />
        </div>
      </div>
    </div>
  );
}
