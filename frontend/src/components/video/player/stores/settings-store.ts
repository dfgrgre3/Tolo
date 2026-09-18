/**
 * Settings Store - User preferences and video settings
 * @module video/player/stores/settings-store
 */

import { create, type StoreApi } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AudioTrack, QualityOption } from "../types";
import { WATERMARK_POSITIONS } from "../constants";

interface SettingsState {
  // Video quality (P1-11: selection is by stable `key`, never by level index)
  qualities: QualityOption[];
  selectedQualityKey: string;
  currentAutoQuality: number | null;
  currentAutoBitrate: number | null;

  // Audio tracks (P1-12): HLS-discovered list + stable selection.
  // "auto" = default track; otherwise the track id.
  hlsAudioTracks: AudioTrack[];
  selectedAudioTrack: string;
  
  // Subtitles
  selectedSubtitle: string;
  subtitleSize: "sm" | "md" | "lg" | "xl";
  subtitleBgOpacity: number;
  
  // Display settings
  brightness: number;
  zoomFactor: number;
  panOffset: { x: number; y: number };
  isAmbientMode: boolean;
  
  // Watermark
  watermarkIndex: number;
  
  // Watch time tracking
  watchSeconds: number;
}

interface SettingsActions {
  setSettingsState: (partial: Partial<SettingsState> | ((state: SettingsState) => Partial<SettingsState>)) => void;
  resetSettingsState: (partial?: Partial<SettingsState>) => void;
  setSelectedQualityKey: (key: string) => void;
  setCurrentAutoQuality: (quality: number | null) => void;
  setSelectedAudioTrack: (trackId: string) => void;
  setSelectedSubtitle: (subtitle: string) => void;
  setSubtitleSize: (size: "sm" | "md" | "lg" | "xl") => void;
  setSubtitleBgOpacity: (opacity: number) => void;
  setBrightness: (brightness: number) => void;
  setZoomFactor: (factor: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  toggleAmbientMode: (isAmbient?: boolean) => void;
  incrementWatermarkIndex: () => void;
  incrementWatchSeconds: (seconds: number) => void;
  resetWatchSeconds: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const createDefaultSettingsState = (): SettingsState => ({
  qualities: [],
  selectedQualityKey: "auto",
  currentAutoQuality: null,
  currentAutoBitrate: null,
  hlsAudioTracks: [],
  selectedAudioTrack: "auto",
  selectedSubtitle: "off",
  subtitleSize: "md",
  subtitleBgOpacity: 0.7,
  brightness: 1,
  zoomFactor: 1,
  panOffset: { x: 0, y: 0 },
  isAmbientMode: true,
  watermarkIndex: 0,
  watchSeconds: 0,
});

export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector((set) => ({
    ...createDefaultSettingsState(),

    setSettingsState: (partial) =>
      set((state) => ({
        ...(typeof partial === "function" ? partial(state) : partial),
      })),

    resetSettingsState: (partial) =>
      set(() => ({
        ...createDefaultSettingsState(),
        ...partial,
      })),

    setSelectedQualityKey: (selectedQualityKey) => set({ selectedQualityKey }),
    setSelectedAudioTrack: (selectedAudioTrack) => set({ selectedAudioTrack }),
    setCurrentAutoQuality: (currentAutoQuality) => set({ currentAutoQuality }),
    setSelectedSubtitle: (selectedSubtitle) => set({ selectedSubtitle }),
    setSubtitleSize: (subtitleSize) => set({ subtitleSize }),
    setSubtitleBgOpacity: (subtitleBgOpacity) => set({ subtitleBgOpacity }),
    setBrightness: (brightness) => set({ brightness }),
    setZoomFactor: (zoomFactor) => set({ zoomFactor }),
    setPanOffset: (panOffset) => set({ panOffset }),
    
    toggleAmbientMode: (isAmbient) =>
      set((state) => ({
        isAmbientMode: isAmbient !== undefined ? isAmbient : !state.isAmbientMode,
      })),
    
    incrementWatermarkIndex: () =>
      set((state) => ({
        watermarkIndex: (state.watermarkIndex + 1) % WATERMARK_POSITIONS.length,
      })),
    
    incrementWatchSeconds: (seconds) =>
      set((state) => ({
        watchSeconds: state.watchSeconds + seconds,
      })),
    
    resetWatchSeconds: () => set({ watchSeconds: 0 }),
  }))
);

/**
 * Player-scoped factory (P0 fix): isolated settings store per player
 * instance (quality / subtitles / brightness / zoom / watchSeconds).
 * Watch-time therefore no longer leaks across players. See playback-store.ts.
 */
export function createSettingsStoreInstance(
  initial?: Partial<SettingsState>
): StoreApi<SettingsStore> {
  return create<SettingsStore>()(
    subscribeWithSelector((set) => ({
      ...createDefaultSettingsState(),
      ...initial,

      setSettingsState: (partial) =>
        set((state) => ({
          ...(typeof partial === "function" ? partial(state) : partial),
        })),

      resetSettingsState: (partial) =>
        set(() => ({
          ...createDefaultSettingsState(),
          ...initial,
          ...partial,
        })),

      setSelectedQualityKey: (selectedQualityKey) => set({ selectedQualityKey }),
    setSelectedAudioTrack: (selectedAudioTrack) => set({ selectedAudioTrack }),
      setCurrentAutoQuality: (currentAutoQuality) => set({ currentAutoQuality }),
      setSelectedSubtitle: (selectedSubtitle) => set({ selectedSubtitle }),
      setSubtitleSize: (subtitleSize) => set({ subtitleSize }),
      setSubtitleBgOpacity: (subtitleBgOpacity) => set({ subtitleBgOpacity }),
      setBrightness: (brightness) => set({ brightness }),
      setZoomFactor: (zoomFactor) => set({ zoomFactor }),
      setPanOffset: (panOffset) => set({ panOffset }),

      toggleAmbientMode: (isAmbient) =>
        set((state) => ({
          isAmbientMode: isAmbient !== undefined ? isAmbient : !state.isAmbientMode,
        })),

      incrementWatermarkIndex: () =>
        set((state) => ({
          watermarkIndex: (state.watermarkIndex + 1) % WATERMARK_POSITIONS.length,
        })),

      incrementWatchSeconds: (seconds) =>
        set((state) => ({
          watchSeconds: state.watchSeconds + seconds,
        })),

      resetWatchSeconds: () => set({ watchSeconds: 0 }),
    }))
  );
}
