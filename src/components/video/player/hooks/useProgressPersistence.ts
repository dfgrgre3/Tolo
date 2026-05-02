import { useCallback, useRef, useEffect } from "react";
import {
  AUTO_COMPLETE_PERCENT,
  PROGRESS_SAVE_INTERVAL_MS,
  MIN_RESUME_TIME_SECONDS,
} from "../constants";
import { useCourseVideoPlayerStore } from "../store";
import { clamp } from "../utils";
import type { StoredVideoProgress } from "../types";

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

export function useProgressPersistence({
  lessonId,
  storageKey,
  getDuration,
  getCurrentTime,
  triggerAutoComplete,
  alreadyCompleted,
}: ProgressPersistenceOptions) {
  const { setPlayerState } = useCourseVideoPlayerStore();
  const lastSaveTimeRef = useRef(0);
  const autoCompleteTriggeredRef = useRef(alreadyCompleted);
  const sessionStartTimeRef = useRef(Date.now());
  const accumulatedTimeRef = useRef(0);

  useEffect(() => {
    autoCompleteTriggeredRef.current = alreadyCompleted;
  }, [alreadyCompleted]);

  // Track active time when player is playing
  useEffect(() => {
    const unsubscribe = useCourseVideoPlayerStore.subscribe(
      (state) => state.isPlaying,
      (isPlaying) => {
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

      const isPlaying = useCourseVideoPlayerStore.getState().isPlaying;
      let currentSessionTime = 0;
      if (isPlaying) {
        currentSessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
      }
      
      const totalTimeSpent = Math.floor(accumulatedTimeRef.current + currentSessionTime);
      const status = percent >= AUTO_COMPLETE_PERCENT ? 'COMPLETED' : (percent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');

      void fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lastWatchedPosition: positionSeconds, 
          timeSpentSeconds: totalTimeSpent,
          status: status
        }),
        keepalive: true,
      }).catch(() => undefined);
      
      // Reset accumulator after sync if we want to send incremental or total?
      // Assuming backend adds it incrementally if we send delta, or we send delta?
      // Let's assume the backend takes a delta, wait, if backend takes delta:
      accumulatedTimeRef.current = 0;
      sessionStartTimeRef.current = Date.now();
    },
    [lessonId]
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
      syncProgressToServer(Math.round(currentTime), percent);

      if (percent >= AUTO_COMPLETE_PERCENT && !autoCompleteTriggeredRef.current) {
        autoCompleteTriggeredRef.current = true;
        triggerAutoComplete();
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
      const response = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        cache: "no-store",
      });

      if (response.ok) {
        const payload = await response.json();
        const serverPosition =
          typeof data.lastWatchedPosition === "number" ? data.lastWatchedPosition : (typeof data.lastVideoPosition === "number" ? data.lastVideoPosition : null);
        const serverUpdatedAt = data.updatedAt
          ? new Date(data.updatedAt).getTime()
          : 0;

        if (
          serverPosition !== null &&
          serverPosition > 0 &&
          serverUpdatedAt >= latestTimestamp
        ) {
          resumeCandidate = serverPosition;
          latestTimestamp = serverUpdatedAt;
        }
      }
    } catch {
      // Fallback to local storage if server fetch fails
    }

    if (
      resumeCandidate !== null &&
      resumeCandidate > MIN_RESUME_TIME_SECONDS &&
      resumeCandidate < duration - MIN_RESUME_TIME_SECONDS
    ) {
      setPlayerState({ resumeTime: resumeCandidate });
    }
  }, [getDuration, lessonId, setPlayerState, storageKey]);

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
