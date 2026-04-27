import { create } from "zustand";
import { AUTOPLAY_NEXT_SECONDS } from "./constants";
import type {
  PlayerFeedback,
  QualityOption,
  SidebarTab,
} from "./types";

type PlayerUiState = {
  isPlaying: boolean;
  isLoading: boolean;
  showControls: boolean;
  isFullscreen: boolean;
  isPip: boolean;
  isSettingsOpen: boolean;
  isHelpOpen: boolean;
  isStatsOpen: boolean;
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
  errorMessage: string | null;
  feedback: PlayerFeedback;
  resumeTime: number | null;
  isEnded: boolean;
  autoplayCountdown: number;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isAmbientMode: boolean;
  watchSeconds: number;
  qualities: QualityOption[];
  selectedQuality: number;
  currentAutoQuality: number | null;
  selectedSubtitle: string;
  watermarkIndex: number;
  brightness: number;
  loopStart: number | null;
  loopEnd: number | null;
};

type PlayerStore = PlayerUiState & {
  setPlayerState: (
    partial:
      | Partial<PlayerUiState>
      | ((state: PlayerUiState) => Partial<PlayerUiState>)
  ) => void;
  resetPlayerState: (partial?: Partial<PlayerUiState>) => void;
};

export const defaultPlayerUiState: PlayerUiState = {
  isPlaying: false,
  isLoading: true,
  showControls: true,
  isFullscreen: false,
  isPip: false,
  isSettingsOpen: false,
  isHelpOpen: false,
  isStatsOpen: false,
  isSidebarOpen: false,
  sidebarTab: "bookmarks",
  errorMessage: null,
  feedback: null,
  resumeTime: null,
  isEnded: false,
  autoplayCountdown: AUTOPLAY_NEXT_SECONDS,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isAmbientMode: true,
  watchSeconds: 0,
  qualities: [],
  selectedQuality: -1,
  currentAutoQuality: null,
  selectedSubtitle: "off",
  watermarkIndex: 0,
  brightness: 1,
  loopStart: null,
  loopEnd: null,
};

export const useCourseVideoPlayerStore = create<PlayerStore>((set) => ({
  ...defaultPlayerUiState,
  setPlayerState: (partial) =>
    set((state) => ({
      ...(typeof partial === "function" ? partial(state) : partial),
    })),
  resetPlayerState: (partial) =>
    set(() => ({
      ...defaultPlayerUiState,
      ...partial,
    })),
}));
