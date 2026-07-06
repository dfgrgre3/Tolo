/**
 * Settings Store - User preferences and video settings
 * @module video/player/stores/settings-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { QualityOption } from "../types";

interface SettingsState {
  // Video quality
  qualities: QualityOption[];
  selectedQuality: number;
  currentAutoQuality: number | null;
  
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
  setSelectedQuality: (quality: number) => void;
  setCurrentAutoQuality: (quality: number | null) => void;
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
  selectedQuality: -1,
  currentAutoQuality: null,
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

    setSelectedQuality: (selectedQuality) => set({ selectedQuality }),
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
        watermarkIndex: (state.watermarkIndex + 1) % 12, // Assuming 12 positions
      })),
    
    incrementWatchSeconds: (seconds) =>
      set((state) => ({
        watchSeconds: state.watchSeconds + seconds,
      })),
    
    resetWatchSeconds: () => set({ watchSeconds: 0 }),
  }))
);
