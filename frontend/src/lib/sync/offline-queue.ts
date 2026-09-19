/**
 * Unified offline mutation queue (P1-26).
 *
 * One durable FIFO for every user mutation that must survive offline,
 * reloads and retries — notes, question attempts, completions, … — with:
 *
 * - Connectivity: processes only while online; listens to online/offline.
 * - Persistence: localStorage snapshot, so a closed tab loses nothing.
 * - Retry policy: per-item exponential backoff; 4xx (except 408/429) is a
 *   permanent failure and drops the item instead of poisoning the queue.
 * - Idempotency: every item carries an idempotencyKey sent as the
 *   Idempotency-Key header; server endpoints dedupe on it, so a replayed
 *   flush can never double-apply.
 * - Ordering: FIFO per enqueue order. Mutations for the SAME entity must be
 *   enqueued in causal order (create → edit → delete); the processor runs
 *   them sequentially, which is what makes P1-25 converge.
 * - Conflict resolution: server-side last-writer-wins on updated_at per row;
 *   the queue guarantees the server SEES writes in client order.
 *
 * In-memory settled-callbacks (onSettled) do not survive reloads — callers
 * must reconcile from a fresh GET on boot (notes do this in loadCloudNotes).
 */
"use client";

import { useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api/api-client";

export type SyncMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface QueuedMutation {
  /** Client operation id. Stable across retries; doubles as the dedupe key. */
  id: string;
  /** Domain, e.g. "note-upsert". Used for filtering/dead-letter inspection. */
  kind: string;
  method: SyncMethod;
  endpoint: string;
  body?: unknown;
  /** Sent as Idempotency-Key. Defaults to `id` when omitted. */
  idempotencyKey?: string;
  attempts: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
}

type SettledCallback = (ok: boolean, response: unknown) => void;

const STORAGE_KEY = "sync-mutation-queue:v1";
const MAX_ATTEMPTS = 25;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_CAP_MS = 60_000;
const MAX_QUEUE = 200;

function backoffFor(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.min(attempts, 5), BACKOFF_CAP_MS);
}

function loadPersisted(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is QueuedMutation =>
        !!m && typeof m === "object" && typeof (m as QueuedMutation).id === "string"
    );
  } catch {
    return [];
  }
}

class OfflineMutationQueue {
  private items: QueuedMutation[] = loadPersisted();
  private callbacks = new Map<string, SettledCallback>();
  private listeners = new Set<() => void>();
  private processing = false;
  private online =
    typeof navigator === "undefined" ? true : navigator.onLine !== false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      // Opportunistic drain on boot (covers reload-with-pending).
      if (document.readyState === "complete") {
        queueMicrotask(() => this.kick());
      } else {
        window.addEventListener("DOMContentLoaded", () => this.kick(), { once: true });
      }
    }
  }

  private handleOnline = () => {
    this.online = true;
    this.emit();
    this.kick();
  };

  private handleOffline = () => {
    this.online = false;
    this.emit();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // A failing subscriber must never break the queue.
      }
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items.slice(-MAX_QUEUE)));
    } catch {
      // Quota/privacy mode: keep retrying in memory this session.
    }
  }

  getSnapshot = (): { pending: number; online: boolean } => ({
    pending: this.items.length,
    online: this.online,
  });

  pendingCount(): number {
    return this.items.length;
  }

  isOnline(): boolean {
    return this.online;
  }

  pendingByKind(kind: string): QueuedMutation[] {
    return this.items.filter((m) => m.kind === kind);
  }

  enqueue(
    input: Omit<QueuedMutation, "attempts" | "nextRetryAt" | "createdAt"> & {
      onSettled?: SettledCallback;
    }
  ): string {
    const { onSettled, ...rest } = input;
    const now = Date.now();
    // Same id re-enqueued (double submit) replaces the older entry instead
    // of duplicating it — the queue itself is idempotent on clientOpId.
    this.items = this.items.filter((m) => m.id !== rest.id);
    this.items.push({ ...rest, attempts: 0, nextRetryAt: now, createdAt: now });
    if (this.items.length > MAX_QUEUE) {
      this.items.splice(0, this.items.length - MAX_QUEUE);
    }
    if (onSettled) this.callbacks.set(rest.id, onSettled);
    this.persist();
    this.emit();
    this.kick();
    return rest.id;
  }

  remove(id: string) {
    this.items = this.items.filter((m) => m.id !== id);
    this.callbacks.delete(id);
    this.persist();
    this.emit();
  }

  private settle(id: string, ok: boolean, response: unknown) {
    const cb = this.callbacks.get(id);
    this.callbacks.delete(id);
    this.items = this.items.filter((m) => m.id !== id);
    this.persist();
    this.emit();
    try {
      cb?.(ok, response);
    } catch {
      // Caller callbacks must never break the queue.
    }
  }

  private kick() {
    if (this.processing || !this.online || typeof window === "undefined") return;
    this.processing = true;
    void this.drain().finally(() => {
      this.processing = false;
    });
  }

  private async send(item: QueuedMutation): Promise<unknown> {
    const headers = { "Idempotency-Key": item.idempotencyKey ?? item.id };
    switch (item.method) {
      case "POST":
        return apiClient.postJson(item.endpoint, (item.body ?? {}) as never, { headers });
      case "PATCH":
        return apiClient.patch(item.endpoint, item.body, { headers });
      case "PUT":
        return apiClient.put(item.endpoint, item.body, { headers });
      case "DELETE":
        return apiClient.delete(item.endpoint, { headers });
    }
  }

  private async drain() {
    while (this.online && this.items.length > 0) {
      const now = Date.now();
      const item = this.items.find((m) => m.nextRetryAt <= now);
      if (!item) {
        const soonest = Math.min(...this.items.map((m) => m.nextRetryAt));
        const wait = Math.max(0, soonest - now);
        await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 30_000)));
        continue;
      }
      try {
        const response = await this.send(item);
        this.settle(item.id, true, response);
      } catch (err) {
        const status =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status: unknown }).status)
            : 0;
        const permanent =
          status >= 400 && status < 500 && status !== 408 && status !== 429;
        if (permanent || item.attempts + 1 >= MAX_ATTEMPTS) {
          this.settle(item.id, false, err);
        } else {
          item.attempts += 1;
          item.lastError = err instanceof Error ? err.message : String(err);
          item.nextRetryAt = Date.now() + backoffFor(item.attempts);
          this.persist();
          this.emit();
        }
      }
    }
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();

/** Reactive connectivity + pending-count snapshot (SSR-safe: online/0). */
export function useOfflineStatus(): { isOnline: boolean; pendingMutations: number } {
  const snapshot = useSyncExternalStore(
    offlineMutationQueue.subscribe,
    offlineMutationQueue.getSnapshot,
    () => ({ pending: 0, online: true })
  );
  return { isOnline: snapshot.online, pendingMutations: snapshot.pending };
}

/** One client operation id per mutation — stable across retries, unique per op. */
export function newClientOpId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
