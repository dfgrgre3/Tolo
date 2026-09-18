/**
 * Player Scope — P0 fix for global singleton stores.
 *
 * Gives every <CourseVideoPlayer/> its own isolated
 * playback / UI / settings stores, keyed by playerInstanceId + courseId +
 * lessonId, so two players on the same page never share currentTime,
 * volume, isPlaying, activeQuestionId, sidebar, settings or watch time.
 *
 * Migration path (incremental, backwards compatible):
 * - New code: use usePlayerPlayback / usePlayerUI / usePlayerSettings
 *   selectors and usePlayerStores() for getState()/subscribe().
 * - Old code: legacy usePlaybackStore / useUIStore / useSettingsStore keep
 *   working as a fallback when no provider is present.
 *
 * @module video/player/stores/player-scope
 */
"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useStore, type StoreApi } from "zustand";
import {
  createPlaybackStoreInstance,
  usePlaybackStore,
} from "./playback-store";
import type { PlaybackStore } from "./playback-store";
import { createUIStoreInstance, useUIStore } from "./ui-store";
import type { UIStore } from "./ui-store";
import { createSettingsStoreInstance, useSettingsStore } from "./settings-store";
import type { SettingsStore } from "./settings-store";

export interface PlayerScopeValue {
  playerInstanceId: string;
  courseId: string;
  lessonId: string;
  playback: StoreApi<PlaybackStore>;
  ui: StoreApi<UIStore>;
  settings: StoreApi<SettingsStore>;
}

const PlayerScopeContext = createContext<PlayerScopeValue | null>(null);

let instanceCounter = 0;

export function createPlayerScope(
  courseId: string,
  lessonId: string,
  playerInstanceId?: string
): PlayerScopeValue {
  return {
    playerInstanceId:
      playerInstanceId ?? `player-${Date.now().toString(36)}-${(instanceCounter += 1)}`,
    courseId,
    lessonId,
    playback: createPlaybackStoreInstance(),
    ui: createUIStoreInstance(),
    settings: createSettingsStoreInstance(),
  };
}

export function PlayerScopeProvider({
  courseId,
  lessonId,
  playerInstanceId,
  scope,
  children,
}: {
  courseId: string;
  lessonId: string;
  playerInstanceId?: string;
  /** Pre-created scope (stable across renders). If omitted one is created. */
  scope?: PlayerScopeValue;
  children: ReactNode;
}) {
  const value = useMemo<PlayerScopeValue>(
    () => scope ?? createPlayerScope(courseId, lessonId, playerInstanceId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope identity is owned by the caller
    [scope]
  );
  return (
    <PlayerScopeContext.Provider value={value}>
      {children}
    </PlayerScopeContext.Provider>
  );
}

/** Raw store handles (getState / setState / subscribe). Null outside provider. */
export function usePlayerScope(): PlayerScopeValue | null {
  return useContext(PlayerScopeContext);
}

/** Store handles with legacy-global fallback for unmigrated call sites. */
export function usePlayerStores(): {
  playback: StoreApi<PlaybackStore>;
  ui: StoreApi<UIStore>;
  settings: StoreApi<SettingsStore>;
  scoped: boolean;
} {
  const ctx = useContext(PlayerScopeContext);
  return useMemo(
    () =>
      ctx
        ? { playback: ctx.playback, ui: ctx.ui, settings: ctx.settings, scoped: true }
        : {
            playback: usePlaybackStore as unknown as StoreApi<PlaybackStore>,
            ui: useUIStore as unknown as StoreApi<UIStore>,
            settings: useSettingsStore as unknown as StoreApi<SettingsStore>,
            scoped: false,
          },
    [ctx]
  );
}

// --- Scoped selectors (drop-in replacements with global fallback) ---

export function usePlayerPlayback(): PlaybackStore;
export function usePlayerPlayback<T>(selector: (s: PlaybackStore) => T): T;
export function usePlayerPlayback<T>(selector?: (s: PlaybackStore) => T): T | PlaybackStore {
  const ctx = useContext(PlayerScopeContext);
  if (ctx) return useStore(ctx.playback, selector as (s: PlaybackStore) => T);
  return (usePlaybackStore as unknown as <U>(sel?: (s: PlaybackStore) => U) => U)(selector);
}

export function usePlayerUI(): UIStore;
export function usePlayerUI<T>(selector: (s: UIStore) => T): T;
export function usePlayerUI<T>(selector?: (s: UIStore) => T): T | UIStore {
  const ctx = useContext(PlayerScopeContext);
  if (ctx) return useStore(ctx.ui, selector as (s: UIStore) => T);
  return (useUIStore as unknown as <U>(sel?: (s: UIStore) => U) => U)(selector);
}

export function usePlayerSettings(): SettingsStore;
export function usePlayerSettings<T>(selector: (s: SettingsStore) => T): T;
export function usePlayerSettings<T>(selector?: (s: SettingsStore) => T): T | SettingsStore {
  const ctx = useContext(PlayerScopeContext);
  if (ctx) return useStore(ctx.settings, selector as (s: SettingsStore) => T);
  return (useSettingsStore as unknown as <U>(sel?: (s: SettingsStore) => U) => U)(selector);
}
