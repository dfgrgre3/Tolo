import { useCallback, useRef, useEffect, useState } from "react";
import {
  AUTO_COMPLETE_PERCENT,
  PROGRESS_SAVE_INTERVAL_MS,
  MIN_RESUME_TIME_SECONDS,
} from "../constants";
import { usePlayerPlayback, usePlayerStores } from "../stores/player-scope";
import { clamp } from "../utils";
import type { StoredVideoProgress } from "../types";
import {
  PLAYER_PROTOCOL_VERSION,
  readLessonProgress,
  reportLessonCompletion,
  sendProgressHeartbeat,
  type ProgressHeartbeat,
} from "@/lib/course-progress";

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

function readPendingHeartbeats(storageKey: string): ProgressHeartbeat[] {
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
  const setPlaybackState = usePlayerPlayback((s) => s.setPlaybackState);
  const stores = usePlayerStores();

  // One playback session per hook mount (player remounts per lesson via key).
  // Distinct sessions → distinct idempotency keys → no cross-tab double count.
  const [sessionId] = useState(() => crypto.randomUUID());
  const sequenceRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const lastHeartbeatAtRef = useRef(0);
  const completionSentRef = useRef(alreadyCompleted);
  const drainRef = useRef<Promise<void> | null>(null);
  const queueRef = useRef<ProgressHeartbeat[] | null>(null);
  const pendingKey = `${storageKey}:pending-v2`;

  const persistPending = useCallback((queue: ProgressHeartbeat[]) => {
    try {
      if (queue.length === 0) localStorage.removeItem(pendingKey);
      else localStorage.setItem(pendingKey, JSON.stringify(queue.slice(-20)));
    } catch {
      // Keep retrying in memory when local storage is unavailable.
    }
  }, [pendingKey]);

  const flushPending = useCallback(async () => {
    if (drainRef.current) return drainRef.current;
    const drain = (async () => {
      const queue = queueRef.current ?? readPendingHeartbeats(pendingKey);
      queueRef.current = queue;
      while (queue.length > 0) {
        try {
          // Each heartbeat carries its own Idempotency-Key
          // (sessionId:sequenceNumber): a retried send replays server-side
          // without re-adding deltas — retry / reconnect / pagehide can never
          // double-count, even across tabs.
          await sendProgressHeartbeat(lessonId, queue[0]!);
          queue.shift();
          persistPending(queue);
        } catch {
          break;
        }
      }
    })();
    drainRef.current = drain;
    try {
      await drain;
    } finally {
      drainRef.current = null;
    }
  }, [lessonId, pendingKey, persistPending]);

  const enqueueHeartbeat = useCallback((heartbeat: ProgressHeartbeat) => {
    const queue = queueRef.current ?? readPendingHeartbeats(pendingKey);
    queueRef.current = queue;
    queue.push(heartbeat);
    if (queue.length > 20) queue.splice(0, queue.length - 20);
    persistPending(queue);
    void flushPending();
  }, [flushPending, pendingKey, persistPending]);

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
    completionSentRef.current = alreadyCompleted;
  }, [alreadyCompleted]);

  // Heartbeat + completion are INDEPENDENT paths (P0-7):
  // - the heartbeat is ALWAYS enqueued (even past the auto-complete
  //   threshold — previously the progress write was SKIPPED at ≥90%);
  // - completion is a separate idempotent command, sent at most once.
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

      // Time deltas partition the wall clock since the previous heartbeat:
      // no overlap, no gaps, no separate accumulator to drift.
      const lastAt = lastHeartbeatAtRef.current || now;
      const elapsedSeconds = Math.max(0, (now - lastAt) / 1000);
      const isPlaying = stores.playback.getState().isPlaying;
      const heartbeat: ProgressHeartbeat = {
        sessionId,
        sequenceNumber: (sequenceRef.current += 1),
        positionSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
        watchedPercent: percent,
        watchedSecondsDelta: elapsedSeconds,
        activeSecondsDelta: isPlaying ? elapsedSeconds : 0,
        completed: percent >= AUTO_COMPLETE_PERCENT,
        clientTimestampMs: now,
        playerVersion: PLAYER_PROTOCOL_VERSION,
      };
      lastSaveTimeRef.current = now;
      lastHeartbeatAtRef.current = now;
      enqueueHeartbeat(heartbeat);

      if (percent >= AUTO_COMPLETE_PERCENT && !completionSentRef.current) {
        completionSentRef.current = true;
        // Explicit completion command (own idempotency key
        // `${sessionId}:complete:auto`), independent of the heartbeat above.
        // The parent callback stays as the UI-sync notification; the backend
        // stays authoritative and converges because completion is a state set.
        void reportLessonCompletion(lessonId, {
          sessionId,
          source: "auto",
          positionSeconds: Math.round(currentTime),
          durationSeconds: Math.round(duration),
          watchedPercent: percent,
          clientTimestampMs: now,
        }).catch(() => {
          // Completion still notifies the parent below; a failed command is
          // retried on the next threshold crossing is impossible (guard), so
          // the manual "mark complete" path and the next heartbeat's
          // completed-hint remain as backstops. Reset the guard ONLY for
          // transport failure so a later save can retry exactly once more.
          completionSentRef.current = false;
        });
        triggerAutoComplete();
      }
    },
    [enqueueHeartbeat, getCurrentTime, getDuration, lessonId, sessionId, storageKey, stores.playback, triggerAutoComplete]
  );

  const loadResumeData = useCallback(async () => {
    const duration = getDuration();
    if (!Number.isFinite(duration) || duration <= 0) return;

    let resumeCandidate = readStoredProgress(storageKey)?.currentTime ?? null;
    const latestTimestamp = readStoredProgress(storageKey)?.updatedAt ?? 0;

    try {
      const payload = await readLessonProgress(lessonId);

      const data = payload ?? {};
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
    // Final heartbeat on tab close. keepalive lets it survive pagehide;
    // its idempotency key makes a duplicate (e.g. online-flush racing the
    // keepalive send) a server-side replay, not a double count.
    const onPageHide = () => {
      const duration = getDuration();
      if (!Number.isFinite(duration) || duration <= 0) return;
      const now = Date.now();
      const currentTime = clamp(getCurrentTime(), 0, duration);
      const percent = (currentTime / duration) * 100;
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          currentTime,
          duration,
          percent,
          updatedAt: now,
          completed: percent >= AUTO_COMPLETE_PERCENT,
        } satisfies StoredVideoProgress));
      } catch {
        // Snapshot is best-effort; the keepalive heartbeat below is authoritative.
      }
      const lastAt = lastHeartbeatAtRef.current || now;
      const elapsedSeconds = Math.max(0, (now - lastAt) / 1000);
      const isPlaying = stores.playback.getState().isPlaying;
      void sendProgressHeartbeat(
        lessonId,
        {
          sessionId,
          sequenceNumber: (sequenceRef.current += 1),
          positionSeconds: Math.round(currentTime),
          durationSeconds: Math.round(duration),
          watchedPercent: (currentTime / duration) * 100,
          watchedSecondsDelta: elapsedSeconds,
          activeSecondsDelta: isPlaying ? elapsedSeconds : 0,
          completed: (currentTime / duration) * 100 >= AUTO_COMPLETE_PERCENT,
          clientTimestampMs: now,
          playerVersion: PLAYER_PROTOCOL_VERSION,
        },
        { keepalive: true },
      ).catch(() => undefined);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [getCurrentTime, getDuration, lessonId, sessionId, storageKey, stores.playback]);

  return {
    saveProgress,
    loadResumeData,
  };
}
