/**
 * Store exports - Centralized store access
 * @module video/player/stores
 */

export { usePlaybackStore, createPlaybackStoreInstance } from "./playback-store";
export { useUIStore, createUIStoreInstance } from "./ui-store";
export { useSettingsStore, createSettingsStoreInstance } from "./settings-store";
export {
  PlayerScopeProvider,
  createPlayerScope,
  usePlayerScope,
  usePlayerStores,
  usePlayerPlayback,
  usePlayerUI,
  usePlayerSettings,
} from "./player-scope";
export type { PlayerScopeValue } from "./player-scope";

// Re-export types for convenience
export type { PlaybackStore } from "./playback-store";
export type { UIStore } from "./ui-store";
export type { SettingsStore } from "./settings-store";
