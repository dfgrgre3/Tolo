/**
 * Security Store - Content protection and security state
 * @module video/player/stores/security-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface SecurityState {
  isRecordingDetected: boolean;
  isDevToolsDetected: boolean;
  isUrlShared: boolean;
  tokenExpiry: number | null;
  lastSecurityCheck: number;
  violationCount: number;
}

interface SecurityActions {
  setSecurityState: (partial: Partial<SecurityState> | ((state: SecurityState) => Partial<SecurityState>)) => void;
  resetSecurityState: (partial?: Partial<SecurityState>) => void;
  setRecordingDetected: (detected: boolean) => void;
  setDevToolsDetected: (detected: boolean) => void;
  setUrlShared: (shared: boolean) => void;
  setTokenExpiry: (expiry: number | null) => void;
  incrementViolationCount: () => void;
  resetViolationCount: () => void;
  updateLastSecurityCheck: () => void;
}

export type SecurityStore = SecurityState & SecurityActions;

const createDefaultSecurityState = (): SecurityState => ({
  isRecordingDetected: false,
  isDevToolsDetected: false,
  isUrlShared: false,
  tokenExpiry: null,
  lastSecurityCheck: Date.now(),
  violationCount: 0,
});

export const useSecurityStore = create<SecurityStore>()(
  subscribeWithSelector((set) => ({
    ...createDefaultSecurityState(),

    setSecurityState: (partial) =>
      set((state) => ({
        ...(typeof partial === "function" ? partial(state) : partial),
      })),

    resetSecurityState: (partial) =>
      set(() => ({
        ...createDefaultSecurityState(),
        ...partial,
      })),

    setRecordingDetected: (isRecordingDetected) => set({ isRecordingDetected }),
    setDevToolsDetected: (isDevToolsDetected) => set({ isDevToolsDetected }),
    setUrlShared: (isUrlShared) => set({ isUrlShared }),
    setTokenExpiry: (tokenExpiry) => set({ tokenExpiry }),
    
    incrementViolationCount: () =>
      set((state) => ({
        violationCount: state.violationCount + 1,
      })),
    
    resetViolationCount: () => set({ violationCount: 0 }),
    
    updateLastSecurityCheck: () => set({ lastSecurityCheck: Date.now() }),
  }))
);
