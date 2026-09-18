import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { LessonProgressResponse } from "@/types/domain/mappers";

export type LessonProgressInput = {
  completed?: boolean;
  lastWatchedPosition?: number;
  timeSpentDeltaSeconds?: number;
  status?: "IN_PROGRESS" | "NOT_STARTED";
};

/**
 * The single client boundary for lesson progress mutations.
 * Completion and playback progress must use the same server command so the
 * backend remains the source of truth for course completion and certificates.
 */
export function updateLessonProgress(
  lessonId: string,
  input: LessonProgressInput,
  options?: { keepalive?: boolean },
): Promise<LessonProgressResponse> {
  return apiClient.post<LessonProgressResponse>(
    apiRoutes.courses.lessonProgress(lessonId),
    input,
    options,
  );
}

// ─────────────────────────────────────────────────────────────
// Explicit progress protocol (P0-6 / P0-7).
//
// Every heartbeat carries everything the backend needs to remain the
// authoritative progress store, and every write is idempotent:
//
//   idempotency key = `${sessionId}:${sequenceNumber}`      (heartbeats)
//   idempotency key = `${sessionId}:complete:${source}`     (completion)
//
// Backend contract required:
// - DELTAS ARE ADDITIVE: watchedSecondsDelta / activeSecondsDelta must be
//   ADDED to stored totals, never treated as absolute values.
// - DEDUPE ON KEY: a retried key (retry, pagehide keepalive, reconnect,
//   second tab flushing the same queued item) MUST replay the original
//   response without re-adding deltas — otherwise retry causes double
//   counting.
// - COMPLETION IS A STATE SET, not a counter: repeated `completed: true`
//   writes (player auto-complete + manual "mark complete") must converge to
//   the same state. One-time side effects (XP award, certificates) MUST be
//   guarded by the completed-state transition server-side, never by request
//   count.
// - `completed` inside a heartbeat is a SNAPSHOT HINT for resume/display.
//   It never completes a lesson; only reportLessonCompletion() does.
// ─────────────────────────────────────────────────────────────

export const PLAYER_PROTOCOL_VERSION = "progress/2";

export interface ProgressHeartbeat {
  /** Unique per player mount. Separates concurrent tabs/sessions. */
  sessionId: string;
  /** Monotonic per session. Gaps are fine (unsent heartbeats are dropped). */
  sequenceNumber: number;
  positionSeconds: number;
  durationSeconds: number;
  /** 0–100 snapshot. */
  watchedPercent: number;
  /** Wall-clock seconds since the previous heartbeat (additive). */
  watchedSecondsDelta: number;
  /** Of those, seconds the video was actually playing (additive). */
  activeSecondsDelta: number;
  /** Snapshot hint only — never completes the lesson. */
  completed: boolean;
  clientTimestampMs: number;
  playerVersion: string;
}

export type CompletionSource = "auto" | "manual";

export interface LessonCompletionRequest {
  sessionId: string;
  source: CompletionSource;
  /** Final position context for the completion record. */
  positionSeconds: number;
  durationSeconds: number;
  watchedPercent: number;
  clientTimestampMs: number;
}

export function heartbeatIdempotencyKey(h: Pick<ProgressHeartbeat, "sessionId" | "sequenceNumber">): string {
  return `${h.sessionId}:${h.sequenceNumber}`;
}

export function completionIdempotencyKey(sessionId: string, source: CompletionSource): string {
  return `${sessionId}:complete:${source}`;
}

/**
 * Progress update — position snapshot + additive time deltas.
 * Safe to retry: same (sessionId, sequenceNumber) replays without double count.
 */
export function sendProgressHeartbeat(
  lessonId: string,
  heartbeat: ProgressHeartbeat,
  options?: { keepalive?: boolean },
): Promise<LessonProgressResponse> {
  return apiClient.postJson<LessonProgressResponse, Record<string, unknown>>(
    apiRoutes.courses.lessonProgress(lessonId),
    { ...heartbeat },
    {
      keepalive: options?.keepalive,
      headers: { "Idempotency-Key": heartbeatIdempotencyKey(heartbeat) },
    },
  );
}

/**
 * Completion event — INDEPENDENT from heartbeats (P0-7).
 * The player always keeps sending heartbeats; this command fires at most once
 * per lesson per source and converges (state set, idempotent). The parent's
 * onLessonAutoComplete stays as the UI-sync notification, not the writer.
 */
export function reportLessonCompletion(
  lessonId: string,
  req: LessonCompletionRequest,
  options?: { keepalive?: boolean },
): Promise<LessonProgressResponse> {
  return apiClient.postJson<LessonProgressResponse, Record<string, unknown>>(
    apiRoutes.courses.lessonProgress(lessonId),
    {
      completed: true,
      completionSource: req.source,
      sessionId: req.sessionId,
      positionSeconds: req.positionSeconds,
      durationSeconds: req.durationSeconds,
      watchedPercent: req.watchedPercent,
      clientTimestampMs: req.clientTimestampMs,
      playerVersion: PLAYER_PROTOCOL_VERSION,
    },
    {
      keepalive: options?.keepalive,
      headers: { "Idempotency-Key": completionIdempotencyKey(req.sessionId, req.source) },
    },
  );
}

export function readLessonProgress(lessonId: string) {
  return apiClient.get<{
    lastWatchedPosition?: number;
    lastVideoPosition?: number;
    updatedAt?: string;
  }>(apiRoutes.courses.lessonProgress(lessonId));
}
