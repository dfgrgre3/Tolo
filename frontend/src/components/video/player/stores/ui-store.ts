/**
 * UI Store - UI state management (panels, overlays, controls)
 * @module video/player/stores/ui-store
 */

import { create, type StoreApi } from "zustand";
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
  /**
   * P1-14: user explicitly closed the floating player. While set, the
   * IntersectionObserver must NOT re-trigger it — otherwise dismissing is
   * useless while scrolled away and playing. Cleared when the player scrolls
   * back into view (or on lesson change via fresh scoped stores).
   */
  miniPlayerDismissed: boolean;
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
  miniPlayerDismissed: false,
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

/**
 * Player-scoped factory (P0 fix): isolated UI store per player instance
 * (sidebar / fullscreen / panels / feedback). See playback-store.ts.
 */
export function createUIStoreInstance(
  initial?: Partial<UIState>
): StoreApi<UIStore> {
  return create<UIStore>()(
    subscribeWithSelector((set) => ({
      ...createDefaultUIState(),
      ...initial,

      setUIState: (partial) =>
        set((state) => ({
          ...(typeof partial === "function" ? partial(state) : partial),
        })),

      resetUIState: (partial) =>
        set(() => ({
          ...createDefaultUIState(),
          ...initial,
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
}
