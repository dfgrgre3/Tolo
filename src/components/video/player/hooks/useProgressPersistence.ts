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

  useEffect(() => {
    autoCompleteTriggeredRef.current = alreadyCompleted;
  }, [alreadyCompleted]);

  const syncProgressToServer = useCallback(
    (positionSeconds: number) => {
      if (!Number.isFinite(positionSeconds)) return;

      void fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds }),
        keepalive: true,
      }).catch(() => undefined);
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
      syncProgressToServer(Math.round(currentTime));

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
        const data = (payload.data ?? payload) as {
          lastVideoPosition?: number;
          updatedAt?: string;
        };
        const serverPosition =
          typeof data.lastVideoPosition === "number" ? data.lastVideoPosition : null;
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
