import { useCallback, useRef, useEffect, useState } from "react";
import {
  AUTO_COMPLETE_PERCENT,
  MAX_HEARTBEAT_GAP_SECONDS,
  PEER_FRESHNESS_MS,
  PRESENCE_INTERVAL_MS,
  PROGRESS_SAVE_INTERVAL_MS,
  MIN_RESUME_TIME_SECONDS,
} from "../constants";
import { usePlayerPlayback, usePlayerStores, usePlayerUI } from "../stores/player-scope";
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
  const setUIState = usePlayerUI((s) => s.setUIState);
  const stores = usePlayerStores();

  // One playback session per hook mount (player remounts per lesson via key).
  // Distinct sessions → distinct idempotency keys → no cross-tab double count.
  const [sessionId] = useState(() => crypto.randomUUID());
  // P2-49: session identity origin (analytics, fraud, reconciliation).
  const [sessionStartedAtMs] = useState(() => Date.now());
  const sequenceRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const lastHeartbeatAtRef = useRef(0);
  const completionSentRef = useRef(alreadyCompleted);
  const drainRef = useRef<Promise<void> | null>(null);
  const queueRef = useRef<ProgressHeartbeat[] | null>(null);
  // P2-45: last moment THIS tab was visible (leadership recency signal).
  const lastActivityRef = useRef(0);
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

  // ── Multi-tab leadership (P2-45) ──────────────────────────────────
  // Same lesson in Tab A + Tab B must not BOTH stream heartbeats: deltas
  // are per-session wall-clock partitions, so two playing tabs sum to MORE
  // than real time, and stale positions overwrite fresh ones.
  //
  // Rule (deterministic, negotiation-free): every tab broadcasts presence
  // {visible, activeAt} on a lesson-scoped BroadcastChannel; ALL tabs run
  // the SAME ranking — visible first, then most-recently-active, sessionId
  // as final tiebreak — so they agree on the leader without a handshake.
  // Only the leader sends server heartbeats; followers keep a LOCAL
  // snapshot only. All-hidden → nobody sends (pagehide covers closes).
  const peersRef = useRef<Map<string, { visible: boolean; activeAt: number; seenAt: number }>>(new Map());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const isTabVisible = useCallback(
    () => typeof document === "undefined" || document.visibilityState === "visible",
    []
  );

  const amLeader = useCallback(() => {
    const now = Date.now();
    const self = {
      sessionId,
      visible: isTabVisible(),
      activeAt: lastActivityRef.current,
    };
    const candidates = [self];
    for (const [id, peer] of peersRef.current) {
      if (id === sessionId) continue;
      if (now - peer.seenAt > PEER_FRESHNESS_MS) continue;
      candidates.push({ sessionId: id, visible: peer.visible, activeAt: peer.activeAt });
    }
    const visible = candidates.filter((c) => c.visible);
    const pool = visible.length > 0 ? visible : [];
    if (pool.length === 0) return false; // all hidden — nobody sends
    pool.sort(
      (a, b) => b.activeAt - a.activeAt || (a.sessionId < b.sessionId ? -1 : 1)
    );
    return pool[0]!.sessionId === sessionId;
  }, [isTabVisible, sessionId]);

  const announcePresence = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    if (isTabVisible()) lastActivityRef.current = Date.now();
    try {
      channel.postMessage({
        sessionId,
        visible: isTabVisible(),
        activeAt: lastActivityRef.current,
      });
    } catch {
      // BroadcastChannel may throw on structured-clone edge cases; presence
      // is best-effort — worst case every tab sends (today's behavior).
    }
  }, [isTabVisible, sessionId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    lastActivityRef.current = Date.now();
    const channel = new BroadcastChannel(`lesson-progress:${lessonId}`);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const msg = event.data as { sessionId?: string; visible?: boolean; activeAt?: number } | null;
      if (!msg || typeof msg.sessionId !== "string" || msg.sessionId === sessionId) return;
      peersRef.current.set(msg.sessionId, {
        visible: msg.visible === true,
        activeAt: typeof msg.activeAt === "number" ? msg.activeAt : 0,
        seenAt: Date.now(),
      });
    };
    const onVisibility = () => announcePresence();
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(announcePresence, PRESENCE_INTERVAL_MS);
    announcePresence();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      channelRef.current = null;
      channel.close();
    };
  }, [announcePresence, lessonId, sessionId]);

  // Heartbeat + completion are INDEPENDENT paths (P0-7):
  // - the heartbeat is ALWAYS enqueued (even past the auto-complete
  //   threshold — previously the progress write was SKIPPED at ≥90%);
  // - completion is a separate idempotent command, sent at most once.
  //
  // P2-48 (tracking accuracy): elapsed wall-clock is CAPPED so sleep,
  // throttling or a hidden tab can never inject phantom watch time; ACTIVE
  // seconds additionally require visible + actually-playing (not buffering).
  const computeDeltas = useCallback((now: number) => {
    const lastAt = lastHeartbeatAtRef.current || now;
    const rawElapsed = Math.max(0, (now - lastAt) / 1000);
    // Cap: heartbeats run every PROGRESS_SAVE_INTERVAL_MS; anything beyond
    // 2.5× the cadence is dead air (sleep/hidden/throttled), not watching.
    const watchedSecondsDelta = Math.min(rawElapsed, MAX_HEARTBEAT_GAP_SECONDS);
    const state = stores.playback.getState();
    const visible =
      typeof document === "undefined" || document.visibilityState === "visible";
    const genuinelyPlaying = state.isPlaying && !state.isLoading && visible;
    return {
      watchedSecondsDelta,
      activeSecondsDelta: genuinelyPlaying ? watchedSecondsDelta : 0,
    };
  }, [stores.playback]);
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

      // P2-45: followers keep the LOCAL snapshot (resume works everywhere)
      // but never stream server heartbeats — one leader per lesson, or the
      // backend double-counts wall-clock across tabs. Refs still advance so
      // a promoted follower starts a tight partition, not a catch-up spike.
      lastSaveTimeRef.current = now;
      lastHeartbeatAtRef.current = now;
      if (!amLeader()) {
        return;
      }

      // Time deltas partition the wall clock since the previous heartbeat:
      // no overlap, no gaps, no separate accumulator to drift. Capped and
      // gated by computeDeltas (P2-48): sleep/hidden/buffering never counts
      // as active viewing.
      const { watchedSecondsDelta, activeSecondsDelta } = computeDeltas(now);
      const heartbeat: ProgressHeartbeat = {
        sessionId,
        sessionStartedAtMs,
        sequenceNumber: (sequenceRef.current += 1),
        positionSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
        watchedPercent: percent,
        watchedSecondsDelta,
        activeSecondsDelta,
        completed: percent >= AUTO_COMPLETE_PERCENT,
        clientTimestampMs: now,
        playerVersion: PLAYER_PROTOCOL_VERSION,
      };
      enqueueHeartbeat(heartbeat);

      // P2-45: completion follows leadership too — a background tab's stale
      // position must never complete a lesson the foreground tab rewound.
      if (percent < AUTO_COMPLETE_PERCENT || !amLeader() || completionSentRef.current) {
        return;
      }
      completionSentRef.current = true;
      // Explicit completion command (own idempotency key
      // `${sessionId}:complete:auto`), independent of the heartbeat above.
      // P2-46: the backend is authoritative — it may REFUSE under the
      // course policy (completionBlocked). Only an accepted completion
      // notifies the parent; a refusal resets the guard and surfaces the
      // requirement instead of faking completion.
      void reportLessonCompletion(lessonId, {
        sessionId,
        source: "auto",
        positionSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
        watchedPercent: percent,
        clientTimestampMs: now,
      }).then((response) => {
        const blocked = response?.completionBlocked;
        if (blocked && blocked.length > 0) {
          completionSentRef.current = false;
          const needsQuestions = blocked.includes("questions");
          setUIState({
            errorMessage: needsQuestions
              ? "أكمل الأسئلة التفاعلية المطلوبة لإتمام هذا الدرس."
              : "واصل المشاهدة لإتمام هذا الدرس.",
          });
          return;
        }
        triggerAutoComplete();
      }).catch(() => {
        // Completion still notifies the parent below; a failed command is
        // retried on the next threshold crossing is impossible (guard), so
        // the manual "mark complete" path and the next heartbeat's
        // completed-hint remain as backstops. Reset the guard ONLY for
        // transport failure so a later save can retry exactly once more.
        completionSentRef.current = false;
      });
    },
    [amLeader, computeDeltas, enqueueHeartbeat, getCurrentTime, getDuration, lessonId, sessionId, sessionStartedAtMs, setUIState, storageKey, triggerAutoComplete]
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
      // P2-45: the local snapshot always saves (resume works everywhere);
      // the server heartbeat follows leadership — a closing follower must
      // not inject a stale catch-up delta.
      if (!amLeader()) return;
      const { watchedSecondsDelta, activeSecondsDelta } = computeDeltas(now);
      void sendProgressHeartbeat(
        lessonId,
        {
          sessionId,
          sessionStartedAtMs,
          sequenceNumber: (sequenceRef.current += 1),
          positionSeconds: Math.round(currentTime),
          durationSeconds: Math.round(duration),
          watchedPercent: (currentTime / duration) * 100,
          watchedSecondsDelta,
          activeSecondsDelta,
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
  }, [amLeader, computeDeltas, getCurrentTime, getDuration, lessonId, sessionId, sessionStartedAtMs, storageKey]);

  return {
    saveProgress,
    loadResumeData,
  };
}
