import { useCallback, useRef, useEffect } from "react";
import {
  AUTO_COMPLETE_PERCENT,
  PROGRESS_SAVE_INTERVAL_MS,
  MIN_RESUME_TIME_SECONDS,
} from "../constants";
import { usePlaybackStore } from "../stores/playback-store";
import { clamp } from "../utils";
import type { StoredVideoProgress } from "../types";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

type ProgressPersistenceOptions = {
  lessonId: string;
  storageKey: string;
  getDuration: () => number;
  getCurrentTime: () => number;
  triggerAutoComplete: () => void;
  alreadyCompleted: boolean;
};

function readStoredProgress(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredVideoProgress) : null;
  } catch {
    return null;
  }
}

type PendingProgress = {
  lastWatchedPosition: number;
  timeSpentDeltaSeconds: number;
  status: "IN_PROGRESS" | "NOT_STARTED";
};

function readPendingProgress(storageKey: string): PendingProgress[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useProgressPersistence({
  lessonId,
  storageKey,
  getDuration,
  getCurrentTime,
  triggerAutoComplete,
  alreadyCompleted,
}: ProgressPersistenceOptions) {
  const setPlaybackState = usePlaybackStore((s) => s.setPlaybackState);
  const lastSaveTimeRef = useRef(0);
  const autoCompleteTriggeredRef = useRef(alreadyCompleted);
  const sessionStartTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const pendingKey = `${storageKey}:pending`;

  const persistPending = useCallback((queue: PendingProgress[]) => {
    try {
      if (queue.length === 0) localStorage.removeItem(pendingKey);
      else localStorage.setItem(pendingKey, JSON.stringify(queue.slice(-20)));
    } catch {
      // Keep retrying in memory when local storage is unavailable.
    }
  }, [pendingKey]);

  const sendProgress = useCallback(async (payload: PendingProgress) => {
    await apiClient.fetch(apiRoutes.courses.lessonProgress(lessonId), {
      method: "POST",
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }, [lessonId]);

  const flushPending = useCallback(async () => {
    const queue = readPendingProgress(pendingKey);
    while (queue.length > 0) {
      try {
        await sendProgress(queue[0]!);
        queue.shift();
        persistPending(queue);
      } catch {
        break;
      }
    }
  }, [pendingKey, persistPending, sendProgress]);

  useEffect(() => {
    const retry = () => { void flushPending(); };
    const interval = window.setInterval(retry, 15000);
    window.addEventListener("online", retry);
    retry();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", retry);
    };
  }, [flushPending]);

  useEffect(() => {
    autoCompleteTriggeredRef.current = alreadyCompleted;
  }, [alreadyCompleted]);

  // Track active time when player is playing
  useEffect(() => {
    // Initialize session start after mount (Date.now() must not run during render)
    if (sessionStartTimeRef.current === 0) {
      sessionStartTimeRef.current = Date.now();
    }

    const unsubscribe = usePlaybackStore.subscribe(
      (state, prevState) => {
        const isPlaying = state.isPlaying;
        const prevIsPlaying = prevState?.isPlaying;
        if (isPlaying === prevIsPlaying) return;
        
        const now = Date.now();
        if (isPlaying) {
          sessionStartTimeRef.current = now;
        } else {
          accumulatedTimeRef.current += (now - sessionStartTimeRef.current) / 1000;
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const syncProgressToServer = useCallback(
    (positionSeconds: number, percent: number) => {
      if (!Number.isFinite(positionSeconds)) return;

      const isPlaying = usePlaybackStore.getState().isPlaying;
      let currentSessionTime = 0;
      if (isPlaying) {
        currentSessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
      }
      
      // The backend contract treats this value as a delta and adds it to the
      // stored total. It is never a cumulative session total.
      const timeSpentDeltaSeconds = Math.floor(accumulatedTimeRef.current + currentSessionTime);
      const status = percent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

      const payload: PendingProgress = { lastWatchedPosition: positionSeconds, timeSpentDeltaSeconds, status };
      void flushPending().then(() => sendProgress(payload)).catch(() => {
        const queue = readPendingProgress(pendingKey);
        queue.push(payload);
        persistPending(queue);
      });
      
      // Reset accumulator after sync if we want to send incremental or total?
      // Assuming backend adds it incrementally if we send delta, or we send delta?
      // Let's assume the backend takes a delta, wait, if backend takes delta:
      accumulatedTimeRef.current = 0;
      sessionStartTimeRef.current = Date.now();
    },
    [flushPending, pendingKey, persistPending, sendProgress]
  );

  const saveProgress = useCallback(
    (force = false) => {
      const duration = getDuration();
      if (!Number.isFinite(duration) || duration <= 0) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastSaveTimeRef.current < PROGRESS_SAVE_INTERVAL_MS) {
        return;
      }

      const currentTime = clamp(getCurrentTime(), 0, duration);
      const percent = (currentTime / duration) * 100;
      const payload: StoredVideoProgress = {
        currentTime,
        duration,
        percent,
        updatedAt: now,
        completed: percent >= AUTO_COMPLETE_PERCENT,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        return;
      }

      lastSaveTimeRef.current = now;
      if (percent >= AUTO_COMPLETE_PERCENT && !autoCompleteTriggeredRef.current) {
        autoCompleteTriggeredRef.current = true;
        // The parent owns the authoritative completion command. Avoid sending
        // a second progress mutation here, which previously caused duplicate
        // lesson-completion writes and competing course-progress responses.
        triggerAutoComplete();
      } else {
        syncProgressToServer(Math.round(currentTime), percent);
      }
    },
    [getDuration, getCurrentTime, storageKey, syncProgressToServer, triggerAutoComplete]
  );

  const loadResumeData = useCallback(async () => {
    const duration = getDuration();
    if (!Number.isFinite(duration) || duration <= 0) return;

    let resumeCandidate = readStoredProgress(storageKey)?.currentTime ?? null;
    let latestTimestamp = readStoredProgress(storageKey)?.updatedAt ?? 0;

    try {
      const payload = await apiClient.get<{
        data?: {
          lastWatchedPosition?: number;
          lastVideoPosition?: number;
          updatedAt?: string;
        };
      }>(apiRoutes.courses.lessonProgress(lessonId));

      const data = payload?.data ?? {};
      const serverPosition =
        typeof data.lastWatchedPosition === "number"
          ? data.lastWatchedPosition
          : typeof data.lastVideoPosition === "number"
            ? data.lastVideoPosition
            : null;
      const serverUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

      if (
        serverPosition !== null &&
        serverPosition > 0 &&
        serverUpdatedAt >= latestTimestamp
      ) {
        resumeCandidate = serverPosition;
        latestTimestamp = serverUpdatedAt;
      }
    } catch {
      // Fallback to local storage if server fetch fails
    }

    if (
      resumeCandidate !== null &&
      resumeCandidate > MIN_RESUME_TIME_SECONDS &&
      resumeCandidate < duration - MIN_RESUME_TIME_SECONDS
    ) {
      setPlaybackState({ resumeTime: resumeCandidate });
    }
  }, [getDuration, lessonId, setPlaybackState, storageKey]);

  useEffect(() => {
    const onPageHide = () => saveProgress(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [saveProgress]);

  return {
    saveProgress,
    loadResumeData,
  };
}
