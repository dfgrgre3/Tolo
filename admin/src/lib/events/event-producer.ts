/**
 * Event Producer - lightweight analytics event emitter.
 * Sends events to the backend ingest endpoint which pushes to Redis Stream.
 * The backend Batch Worker then reads from the stream and writes to DB.
 * This keeps the frontend fast (fire-and-forget) and decouples analytics writes.
 */
import { AnalyticsEvent, AnalyticsEventType } from './types';

const INGEST_ENDPOINT = '/api/events/ingest';
const FLUSH_INTERVAL_MS = 5000;
const BATCH_MAX_SIZE = 20;

let eventBuffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

async function sendBatch(events: string[]) {
  if (events.length === 0) return;

  try {
    const response = await fetch(INGEST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: `[${events.join(',')}]`,
    });

    if (!response.ok && response.status !== 202) {
      console.warn(`[EventProducer] Ingest failed: ${response.status}`);
    }
  } catch (err) {
    console.warn('[EventProducer] Network error, event dropped:', err);
  }
}

async function flush() {
  const batch = eventBuffer.splice(0, BATCH_MAX_SIZE);
  if (batch.length === 0) return;
  await sendBatch(batch);
}

function enqueue(event: AnalyticsEvent) {
  eventBuffer.push(JSON.stringify(event));
  startFlushTimer();

  if (eventBuffer.length >= BATCH_MAX_SIZE) {
    flush();
  }
}

export function emitEvent<T = Record<string, unknown>>(
  type: AnalyticsEventType,
  userId: string,
  payload: T,
) {
  const event: AnalyticsEvent<T> = {
    id: generateId(),
    type,
    userId,
    timestamp: Date.now(),
    payload,
  };

  enqueue(event as unknown as AnalyticsEvent);
}

export function emitRaw(event: AnalyticsEvent) {
  enqueue(event);
}

export function flushNow(): Promise<void> {
  const batch = eventBuffer.splice(0);
  if (batch.length === 0) return Promise.resolve();
  return sendBatch(batch).then(() => {});
}
