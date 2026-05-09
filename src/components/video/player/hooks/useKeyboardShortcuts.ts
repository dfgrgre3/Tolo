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
  togglePlayPause, seekBy, handleSeek, handleVolumeChange, handlePlaybackRateChange,
  toggleMute, toggleFullscreen, togglePip, onToggleTheater, changeSubtitle,
  toggleLoop, setOpenPanel, getDuration, subtitleTracks, selectedSubtitle,
}: KeyboardShortcutsOptions) {
  const { volume, playbackRate, setPlayerState } = useCourseVideoPlayerStore();

  const handleSeekKeys = (key: string, shiftKey: boolean) => {
    if (key === "arrowright" || key === "l") {
      seekBy(shiftKey ? 5 : SEEK_STEP_SECONDS);
      return true;
    }
    if (key === "arrowleft" || key === "j") {
      seekBy(shiftKey ? -5 : -SEEK_STEP_SECONDS);
      return true;
    }
    return false;
  };

  const handleRateKeys = (key: string, shiftKey: boolean, originalKey: string) => {
    if ((key === ">" || key === ".") && (shiftKey || originalKey !== ".")) {
      const idx = PLAYBACK_RATES.indexOf(playbackRate);
      if (idx < PLAYBACK_RATES.length - 1) handlePlaybackRateChange(PLAYBACK_RATES[idx + 1]);
      return true;
    }
    if ((key === "<" || key === ",") && (shiftKey || originalKey !== ",")) {
      const idx = PLAYBACK_RATES.indexOf(playbackRate);
      if (idx > 0) handlePlaybackRateChange(PLAYBACK_RATES[idx - 1]);
      return true;
    }
    return false;
  };

  return useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const key = event.key.toLowerCase();
      const shift = event.shiftKey;

      // Handle simple mappings
      const simpleActions: Record<string, () => void> = {
        " ": togglePlayPause,
        "k": togglePlayPause,
        "m": toggleMute,
        "f": toggleFullscreen,
        "p": togglePip,
        "t": () => onToggleTheater?.(),
        "a": toggleLoop,
        "n": () => setPlayerState({ sidebarTab: "notes", isSidebarOpen: true }),
        "b": () => setPlayerState({ sidebarTab: "bookmarks", isSidebarOpen: true }),
        "home": () => handleSeek(0),
        "escape": () => setOpenPanel(null),
        "?": () => setPlayerState({ isHelpOpen: true }),
      };

      if (simpleActions[key]) {
        event.preventDefault();
        simpleActions[key]();
        return;
      }

      if (handleSeekKeys(key, shift) || handleRateKeys(key, shift, event.key)) {
        event.preventDefault();
        return;
      }

      if (key === "arrowup" || key === "arrowdown") {
        event.preventDefault();
        handleVolumeChange(volume + (key === "arrowup" ? 0.05 : -0.05));
      } else if (key === "c") {
        event.preventDefault();
        const nextSub = selectedSubtitle === "off" && subtitleTracks[0] ? subtitleTracks[0].id : "off";
        changeSubtitle(nextSub);
      } else if (key === "end") {
        event.preventDefault();
        const dur = getDuration();
        if (dur > 0) handleSeek(dur);
      } else if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        const dur = getDuration();
        if (dur > 0) handleSeek((dur * Number(key)) / 10);
      }
    },
    [
      changeSubtitle, getDuration, handleSeek, handleVolumeChange, handlePlaybackRateChange,
      onToggleTheater, playbackRate, seekBy, selectedSubtitle, setOpenPanel, setPlayerState,
      subtitleTracks, toggleFullscreen, toggleLoop, toggleMute, togglePip, togglePlayPause, volume,
    ]
  );
}
