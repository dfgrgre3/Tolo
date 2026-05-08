import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { SEEK_STEP_SECONDS, PLAYBACK_RATES } from "../constants";
import { useCourseVideoPlayerStore } from "../store";

type KeyboardShortcutsOptions = {
  togglePlayPause: () => | Promise<void>;
  seekBy: (seconds: number) => void;
  handleSeek: (time: number) => void;
  handleVolumeChange: (volume: number) => void;
  handlePlaybackRateChange: (rate: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => | Promise<void>;
  togglePip: () => | Promise<void>;
  onToggleTheater?: () => void;
  changeSubtitle: (id: string) => void;
  toggleLoop: () => void;
  setOpenPanel: (panel: "settings" | "help" | "stats" | "sidebar" | null) => void;
  getDuration: () => number;
  subtitleTracks: { id: string }[];
  selectedSubtitle: string;
};

export function useKeyboardShortcuts({
  togglePlayPause,
  seekBy,
  handleSeek,
  handleVolumeChange,
  handlePlaybackRateChange,
  toggleMute,
  toggleFullscreen,
  togglePip,
  onToggleTheater,
  changeSubtitle,
  toggleLoop,
  setOpenPanel,
  getDuration,
  subtitleTracks,
  selectedSubtitle,
}: KeyboardShortcutsOptions) {
  const { volume, playbackRate, setPlayerState } = useCourseVideoPlayerStore();

  return useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlayPause();
          break;
        case "arrowright":
        case "l":
          event.preventDefault();
          // Shift + Arrow = 5 seconds, normal = 10 seconds
          seekBy(event.shiftKey ? 5 : SEEK_STEP_SECONDS);
          break;
        case "arrowleft":
        case "j":
          event.preventDefault();
          seekBy(event.shiftKey ? -5 : -SEEK_STEP_SECONDS);
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
          toggleFullscreen();
          break;
        case "p":
          event.preventDefault();
          togglePip();
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
        case "b":
          event.preventDefault();
          setPlayerState({ sidebarTab: "bookmarks", isSidebarOpen: true });
          break;
        case "home":
          event.preventDefault();
          handleSeek(0);
          break;
        case "end": {
          event.preventDefault();
          const duration = getDuration();
          if (duration > 0) {
            handleSeek(duration);
          }
          break;
        }
        case "escape":
          event.preventDefault();
          setOpenPanel(null);
          break;
        case "?":
          event.preventDefault();
          setPlayerState({ isHelpOpen: true });
          break;
        // Playback rate cycling: > to increase, < to decrease
        case ">":
        case ".": {
          if (!event.shiftKey && event.key === ".") break;
          event.preventDefault();
          const currentIdx = PLAYBACK_RATES.indexOf(playbackRate);
          if (currentIdx < PLAYBACK_RATES.length - 1) {
            handlePlaybackRateChange(PLAYBACK_RATES[currentIdx + 1]);
          }
          break;
        }
        case "<":
        case ",": {
          if (!event.shiftKey && event.key === ",") break;
          event.preventDefault();
          const currentIdx = PLAYBACK_RATES.indexOf(playbackRate);
          if (currentIdx > 0) {
            handlePlaybackRateChange(PLAYBACK_RATES[currentIdx - 1]);
          }
          break;
        }
        // A-B Loop toggle
        case "a":
          event.preventDefault();
          toggleLoop();
          break;
        default:
          if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            const duration = getDuration();
            if (duration > 0) {
              handleSeek((duration * Number(event.key)) / 10);
            }
          }
          break;
      }
    },
    [
      changeSubtitle,
      getDuration,
      handleSeek,
      handleVolumeChange,
      handlePlaybackRateChange,
      onToggleTheater,
      playbackRate,
      seekBy,
      selectedSubtitle,
      setOpenPanel,
      setPlayerState,
      subtitleTracks,
      toggleFullscreen,
      toggleLoop,
      toggleMute,
      togglePip,
      togglePlayPause,
      volume,
    ]
  );
}
