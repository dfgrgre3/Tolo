import type { PlayerPreferences, VideoProvider } from "./types";

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
export const SEEK_STEP_SECONDS = 10;
/** Long-press (touch hold) temporary speed. Applied via player command. */
export const TEMPORARY_SPEED_RATE = 2;
/** Quality key meaning "let the ABR algorithm decide" (hls.currentLevel = -1). */
export const AUTO_QUALITY_KEY = "auto";
export const AUTO_COMPLETE_PERCENT = 90;
export const PROGRESS_SAVE_INTERVAL_MS = 4000;
/**
 * P2-48: heartbeat gap cap (seconds). Heartbeats run every
 * PROGRESS_SAVE_INTERVAL_MS; a gap beyond 2.5× cadence is dead air
 * (sleep, hidden tab, throttling) and must not inflate watch time.
 */
export const MAX_HEARTBEAT_GAP_SECONDS = (PROGRESS_SAVE_INTERVAL_MS / 1000) * 2.5;
/**
 * P2-45: multi-tab presence — announce cadence and peer freshness window.
 * Peers unheard from for longer than the freshness window are forgotten
 * (closed tabs stop announcing).
 */
export const PRESENCE_INTERVAL_MS = 5000;
export const PEER_FRESHNESS_MS = PRESENCE_INTERVAL_MS * 2 + 2000;
export const CONTROLS_HIDE_TIMEOUT_MS = 3000;
export const AUTOPLAY_NEXT_SECONDS = 5;
export const MIN_RESUME_TIME_SECONDS = 5;
export const PLAYER_PREFERENCES_KEY = "course-video-player-preferences:v5";
const LEGACY_PREFERENCES_KEY = "course-video-player-preferences:v4";
const PREFERENCES_SCHEMA_VERSION = 5;
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
  selectedAudioTrack: "auto",
  subtitleSize: "md",
  subtitleBgOpacity: 0.7,
  selectedQualityKey: "auto",
  autoplayNext: true,
  skipIntro: false,
  gesturesEnabled: true,
  shortcutsEnabled: true,
  miniPlayerMode: "auto",
  brightness: 1,
  isSidebarOpen: false,
  sidebarTab: "bookmarks",
};

/** Re-exported for the v4→v5 migration in utils (readPlayerPreferences). */
export { LEGACY_PREFERENCES_KEY, PREFERENCES_SCHEMA_VERSION };

export const providerLabelMap: Record<VideoProvider, string> = {
  youtube: "YouTube",
  bunny: "Bunny Stream",
  cloudflare: "Cloudflare Stream",
  html5: "فيديو",
  unknown: "Video",
};
