/**
 * UI Store - UI state management (panels, overlays, controls)
 * @module video/player/stores/ui-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { SidebarTab, PlayerFeedback } from "../types";

interface UIState {
  // Panel states
  isSettingsOpen: boolean;
  isHelpOpen: boolean;
  isStatsOpen: boolean;
  isShortcutsOpen: boolean;
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
  
  // Control visibility
  showControls: boolean;
  
  // Display modes
  isFullscreen: boolean;
  isPip: boolean;
  isMiniPlayer: boolean;
  isTheaterMode: boolean;
  
  // Error/feedback
  errorMessage: string | null;
  feedback: PlayerFeedback | null;
}

interface UIActions {
  setUIState: (partial: Partial<UIState> | ((state: UIState) => Partial<UIState>)) => void;
  resetUIState: (partial?: Partial<UIState>) => void;
  toggleSettings: (isOpen?: boolean) => void;
  toggleHelp: (isOpen?: boolean) => void;
  toggleStats: (isOpen?: boolean) => void;
  toggleShortcuts: (isOpen?: boolean) => void;
  toggleSidebar: (isOpen?: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setShowControls: (show: boolean) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setPip: (isPip: boolean) => void;
  setMiniPlayer: (isMiniPlayer: boolean) => void;
  setTheaterMode: (isTheaterMode: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  setFeedback: (feedback: PlayerFeedback | null) => void;
}

export type UIStore = UIState & UIActions;

const createDefaultUIState = (): UIState => ({
  isSettingsOpen: false,
  isHelpOpen: false,
  isStatsOpen: false,
  isShortcutsOpen: false,
  isSidebarOpen: false,
  sidebarTab: "bookmarks",
  showControls: true,
  isFullscreen: false,
  isPip: false,
  isMiniPlayer: false,
  isTheaterMode: false,
  errorMessage: null,
  feedback: null,
});

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    ...createDefaultUIState(),

    setUIState: (partial) =>
      set((state) => ({
        ...(typeof partial === "function" ? partial(state) : partial),
      })),

    resetUIState: (partial) =>
      set(() => ({
        ...createDefaultUIState(),
        ...partial,
      })),

    toggleSettings: (isOpen) =>
      set((state) => ({
        isSettingsOpen: isOpen !== undefined ? isOpen : !state.isSettingsOpen,
      })),

    toggleHelp: (isOpen) =>
      set((state) => ({
        isHelpOpen: isOpen !== undefined ? isOpen : !state.isHelpOpen,
      })),

    toggleStats: (isOpen) =>
      set((state) => ({
        isStatsOpen: isOpen !== undefined ? isOpen : !state.isStatsOpen,
      })),

    toggleShortcuts: (isOpen) =>
      set((state) => ({
        isShortcutsOpen: isOpen !== undefined ? isOpen : !state.isShortcutsOpen,
      })),

    toggleSidebar: (isOpen) =>
      set((state) => ({
        isSidebarOpen: isOpen !== undefined ? isOpen : !state.isSidebarOpen,
      })),

    setSidebarTab: (sidebarTab) => set({ sidebarTab }),
    setShowControls: (showControls) => set({ showControls }),
    setFullscreen: (isFullscreen) => set({ isFullscreen }),
    setPip: (isPip) => set({ isPip }),
    setMiniPlayer: (isMiniPlayer) => set({ isMiniPlayer }),
    setTheaterMode: (isTheaterMode) => set({ isTheaterMode }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    setFeedback: (feedback) => set({ feedback }),
  }))
);
