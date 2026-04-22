import type { PlayerPreferences, VideoProvider } from "./types";

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
export const SEEK_STEP_SECONDS = 10;
export const AUTO_COMPLETE_PERCENT = 90;
export const PROGRESS_SAVE_INTERVAL_MS = 4000;
export const CONTROLS_HIDE_TIMEOUT_MS = 2800;
export const AUTOPLAY_NEXT_SECONDS = 5;
export const MIN_RESUME_TIME_SECONDS = 5;
export const PLAYER_PREFERENCES_KEY = "course-video-player-preferences:v4";
export const WATERMARK_POSITIONS = [
  "top-4 left-4",
  "top-4 right-4",
  "bottom-24 left-4",
  "bottom-24 right-4",
  "top-1/3 left-6",
];
export const NOTES_TIMELINE_START = "<!-- course-video-player:timeline:start -->";
export const NOTES_TIMELINE_END = "<!-- course-video-player:timeline:end -->";

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isAmbientMode: true,
  selectedSubtitle: "off",
  brightness: 1,
};

export const providerLabelMap: Record<VideoProvider, string> = {
  youtube: "YouTube",
  bunny: "Bunny Stream",
  cloudflare: "Cloudflare Stream",
  html5: "HTML5",
  unknown: "Video",
};
