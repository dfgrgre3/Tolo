import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { SEEK_STEP_SECONDS } from "../constants";
import { useCourseVideoPlayerStore } from "../store";

type KeyboardShortcutsOptions = {
  togglePlayPause: () => void | Promise<void>;
  seekBy: (seconds: number) => void;
  handleSeek: (time: number) => void;
  handleVolumeChange: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void | Promise<void>;
  togglePip: () => void | Promise<void>;
  onToggleTheater?: () => void;
  changeSubtitle: (id: string) => void;
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
  toggleMute,
  toggleFullscreen,
  togglePip,
  onToggleTheater,
  changeSubtitle,
  setOpenPanel,
  getDuration,
  subtitleTracks,
  selectedSubtitle,
}: KeyboardShortcutsOptions) {
  const { volume, setPlayerState } = useCourseVideoPlayerStore();

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
      onToggleTheater,
      seekBy,
      selectedSubtitle,
      setOpenPanel,
      setPlayerState,
      subtitleTracks,
      toggleFullscreen,
      toggleMute,
      togglePip,
      togglePlayPause,
      volume,
    ]
  );
}
