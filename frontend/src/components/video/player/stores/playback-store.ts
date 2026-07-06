/**
 * Playback Store - Core playback state management
 * @module video/player/stores/playback-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface PlaybackState {
  // Core playback state
  isPlaying: boolean;
  isLoading: boolean;
  isEnded: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  resumeTime: number | null;
  autoplayCountdown: number;
  
  // Playback controls
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  
  // Loop functionality
  loopStart: number | null;
  loopEnd: number | null;
  
  // Interactive questions
  activeQuestionId: string | null;
  answeredQuestionIds: string[];
}

interface PlaybackActions {
  setPlaybackState: (partial: Partial<PlaybackState> | ((state: PlaybackState) => Partial<PlaybackState>)) => void;
  resetPlaybackState: (partial?: Partial<PlaybackState>) => void;
  addAnsweredQuestion: (questionId: string) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  togglePlayPause: (isPlaying?: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
}

export type PlaybackStore = PlaybackState & PlaybackActions;

const createDefaultPlaybackState = (): PlaybackState => ({
  isPlaying: false,
  isLoading: true,
  isEnded: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  resumeTime: null,
  autoplayCountdown: 5,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  loopStart: null,
  loopEnd: null,
  activeQuestionId: null,
  answeredQuestionIds: [],
});

export const usePlaybackStore = create<PlaybackStore>()(
  subscribeWithSelector((set) => ({
    ...createDefaultPlaybackState(),

    setPlaybackState: (partial) =>
      set((state) => ({
        ...(typeof partial === "function" ? partial(state) : partial),
      })),

    resetPlaybackState: (partial) =>
      set(() => ({
        ...createDefaultPlaybackState(),
        ...partial,
      })),

    addAnsweredQuestion: (questionId) =>
      set((state) => ({
        answeredQuestionIds: [...state.answeredQuestionIds, questionId],
      })),

    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setBuffered: (buffered) => set({ buffered }),
    
    togglePlayPause: (isPlaying) =>
      set((state) => ({
        isPlaying: isPlaying !== undefined ? isPlaying : !state.isPlaying,
      })),
    
    setVolume: (volume) => set({ volume }),
    setMuted: (isMuted) => set({ isMuted }),
    setPlaybackRate: (playbackRate) => set({ playbackRate }),
  }))
);
