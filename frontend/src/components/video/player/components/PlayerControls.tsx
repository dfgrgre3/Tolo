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
  Volume1,
  Volume2,
  VolumeX,
  Gauge,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePlaybackStore } from "../stores/playback-store";
import { useUIStore } from "../stores/ui-store";
import type { BookmarkItem, ThumbnailCue, TimelineNote, InteractiveQuestion } from "../types";
import { formatDuration } from "../utils";
import { IconButton } from "./IconButton";
import { ProgressRail } from "./ProgressRail";
import { cn } from "@/lib/utils";
import { useEfficiencyMode } from "@/hooks";
import { useCallback, useRef, type WheelEvent } from "react";


const VolumeControl = ({ isMuted, volume, onToggleMute, onVolumeChange }: any) => {
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="group/volume flex items-center">
      <IconButton icon={VolumeIcon} label="الصوت" onClick={onToggleMute} />
      <div className="w-16 sm:w-0 sm:overflow-hidden sm:transition-all sm:duration-300 sm:group-hover/volume:mr-2 sm:group-hover/volume:w-24 sm:focus-within:w-24 sm:group-focus-within/volume:mr-2 sm:group-focus-within/volume:w-24">
        <div className="relative h-2.5 w-full">
          <input
            type="range" min={0} max={1} step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            aria-label="مستوى الصوت"
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white focus:outline-none focus:ring-2 focus:ring-white/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all"
          />
        </div>
      </div>
    </div>
  );
};

const PlaybackInfo = ({ duration, playbackRate, currentTime, isMobile = false }: any) => {
  const hasCustomRate = playbackRate !== 1;
  
  if (!isMobile) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <span className="rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-white/5 px-3 py-2 text-xs font-bold tabular-nums text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
        {hasCustomRate && (
          <span className="flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-sky-500/5 px-3 py-2 text-xs font-bold text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.15)] backdrop-blur-sm">
            <Gauge className="h-3.5 w-3.5" />
            {playbackRate}x
          </span>
        )}
      </div>
    );
  }
  
  // Mobile: show progress in center, larger text
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-white/5 px-4 py-2 text-sm font-bold tabular-nums text-white/90 shadow-lg backdrop-blur-sm sm:hidden">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>
      {hasCustomRate && (
        <span className="flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-sky-500/5 px-3 py-1.5 text-xs font-bold text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.15)] backdrop-blur-sm sm:hidden">
          <Gauge className="h-3 w-3" />
          {playbackRate}x
        </span>
      )}
    </div>
  );
};

export function PlayerControls({
  markers, thumbnails, notes = [], sidebarHasContent, isTheaterMode, canUsePip,
  onSeek, onSeekBy, onTogglePlayPause, onToggleMute, onVolumeChange, onOpenHelp,
  onToggleTheater, onTogglePip, onToggleSidebar, onToggleFullscreen, onToggleSettings,
  onToggleLoop, onCaptureFrame, interactiveQuestions = [],
}: {
  markers: BookmarkItem[];
  thumbnails: ThumbnailCue[];
  notes?: TimelineNote[];
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
  interactiveQuestions?: InteractiveQuestion[];
}) {
  const {
    duration, buffered, isPlaying, isMuted, volume, playbackRate, currentTime, loopStart, loopEnd,
  } = usePlaybackStore(
    useShallow((state) => ({
      duration: state.duration, buffered: state.buffered,
      isPlaying: state.isPlaying, isMuted: state.isMuted, volume: state.volume,
      playbackRate: state.playbackRate, currentTime: state.currentTime,
      loopStart: state.loopStart, loopEnd: state.loopEnd,
    }))
  );

  const {
    isPip, isFullscreen, isSettingsOpen, isSidebarOpen, showControls,
  } = useUIStore(
    useShallow((state) => ({
      isPip: state.isPip, isFullscreen: state.isFullscreen,
      isSettingsOpen: state.isSettingsOpen, isSidebarOpen: state.isSidebarOpen,
      showControls: state.showControls,
    }))
  );

  const isEfficiencyMode = useEfficiencyMode();
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const currentVol = usePlaybackStore.getState().volume;
    onVolumeChange(Math.min(1, Math.max(0, currentVol + delta)));
  }, [onVolumeChange]);

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 px-5 pb-5 pt-28",
        isEfficiencyMode ? "bg-black/80" : "bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-opacity duration-300",
        showControls ? "opacity-100" : "pointer-events-none opacity-0",
        "sm:px-6 sm:pb-6 sm:pt-24"
      )}
      onWheel={handleWheel}
    >
      <ProgressRail
        duration={duration} buffered={buffered}
        markers={markers} thumbnails={thumbnails} notes={notes} interactiveQuestions={interactiveQuestions} onSeek={onSeek}
      />

      {/* Main control row - mobile optimized */}
      <div className="mt-5 flex flex-col gap-5">
        {/* Top row: Play/Pause + Seek controls - larger on mobile */}
        <div className="flex items-center justify-center gap-4 sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-1.5">
            <IconButton icon={SkipBack} label="رجوع 10 ثوان" onClick={() => onSeekBy(-10)} />
            <button
              type="button" onClick={onTogglePlayPause}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-white to-white/90 text-slate-950 shadow-2xl transition-all duration-200",
                "hover:scale-[1.07] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:from-white hover:to-white active:scale-[0.95]",
                "sm:h-12 sm:w-12" // Slightly smaller on desktop
              )}
              aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            >
              {isPlaying ? <Pause className="h-7 w-7 fill-current sm:h-6 sm:w-6" /> : <Play className="mr-0.5 h-7 w-7 fill-current sm:h-6 sm:w-6" />}
            </button>
            <IconButton icon={SkipForward} label="تقديم 10 ثوان" onClick={() => onSeekBy(10)} />
            <VolumeControl isMuted={isMuted} volume={volume} onToggleMute={onToggleMute} onVolumeChange={onVolumeChange} />
          </div>
          <PlaybackInfo duration={duration} playbackRate={playbackRate} currentTime={currentTime} isMobile />
        </div>

        {/* Bottom row: Action buttons - larger touch targets on mobile */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between">
          <PlaybackInfo duration={duration} playbackRate={playbackRate} />
          <div className="flex items-center gap-2 sm:gap-1.5">
            <IconButton icon={Keyboard} label="اختصارات لوحة المفاتيح" onClick={onOpenHelp} className="h-12 w-12 sm:h-11 sm:w-11" />
            <IconButton icon={Monitor} label="الوضع المسرحي" active={isTheaterMode} onClick={onToggleTheater} className="hidden h-12 w-12 sm:inline-flex sm:h-11 sm:w-11" />
            <IconButton icon={PictureInPicture2} label="نافذة عائمة" active={isPip} disabled={!canUsePip} onClick={onTogglePip} className="hidden h-12 w-12 sm:inline-flex sm:h-11 sm:w-11" />
            <IconButton icon={sidebarHasContent ? ListVideo : FileText} label={isSidebarOpen ? "إغلاق اللوحة الجانبية" : "فتح اللوحة الجانبية"} active={isSidebarOpen} onClick={onToggleSidebar} className="h-12 w-12 sm:h-11 sm:w-11" />
            <IconButton icon={isFullscreen ? Minimize : Maximize} label={isFullscreen ? "الخروج من وضع ملء الشاشة" : "ملء الشاشة"} onClick={onToggleFullscreen} className="h-12 w-12 sm:h-11 sm:w-11" />
            <IconButton icon={Settings2} label={isSettingsOpen ? "إغلاق الإعدادات" : "الإعدادات"} active={isSettingsOpen} onClick={onToggleSettings} className="h-12 w-12 sm:h-11 sm:w-11" />
          </div>
        </div>
      </div>
    </div>
  );
}