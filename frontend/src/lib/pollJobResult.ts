export type AIJobStatus = 'processing' | 'completed' | 'failed' | 'not_found';

import { aiClient } from '@/lib/ai/ai-client';

export interface AIJobResult<T> {
  status: AIJobStatus;
  jobId?: string;
  result?: T;
  error?: string;
}

/**
 * The backend registers a job in the queue before its status becomes visible
 * to the polling endpoint, so the very first polls can legitimately 404
 * ("Job not found or expired"). Tolerate those responses during this window
 * and only treat a persistent not-found as an expired job afterwards.
 */
const NOT_FOUND_GRACE_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_INTERVAL_MS = 1500;

function isJobNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { name?: string; statusCode?: number; status?: number; message?: string };
  if (candidate.name === 'NotFoundError') return true;
  if (candidate.statusCode === 404 || candidate.status === 404) return true;
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  return message.includes('job not found') || message.includes('not_found') || message.includes('expired');
}

export interface PollAIJobOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Generic poller for AI job results.
 *
 * Resolves with the *whole* status payload rather than only its `result`
 * field: the summarize/grade-essay endpoints expose the LLM markdown through
 * top-level `summary` / `evaluation` / `result` aliases, and callers read
 * whichever alias applies.
 *
 * @param jobId The job identifier returned by the async endpoint.
 * @param endpointBase Base endpoint path, e.g. '/api/ai/grade-essay/status'.
 * @param options Poll interval, overall timeout and optional abort signal.
 * @returns Promise that resolves with the status payload when completed, or rejects on failure.
 */
export async function pollAIJobResult<T>(
  jobId: string,
  endpointBase: string,
  options: PollAIJobOptions = {},
): Promise<T> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = options.signal;

  return new Promise<T>((resolve, reject) => {
    const startedAt = Date.now();

    const finish = (action: () => void) => {
      clearInterval(handle);
      clearTimeout(timeoutHandle);
      action();
    };

    const handle = setInterval(async () => {
      if (signal?.aborted) {
        finish(() => reject(new DOMException('Aborted', 'AbortError')));
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(() => reject(new Error('استغرق الأمر وقتاً طويلاً. يرجى المحاولة مرة أخرى.')));
        return;
      }

      try {
        const payload = await aiClient.poll<AIJobResult<T>>(endpointBase, jobId);

        switch (payload?.status) {
          case 'completed':
            // Resolve with the full payload so callers can read top-level
            // aliases (summary/evaluation) that the `result` field doesn't carry.
            finish(() => resolve(payload as unknown as T));
            return;
          case 'failed':
            finish(() => reject(new Error(payload.error || 'فشلت العملية')));
            return;
          case 'not_found':
            // Inside the registration grace window the job may simply not be
            // visible yet — keep polling instead of failing the whole request.
            if (Date.now() - startedAt < NOT_FOUND_GRACE_MS) return;
            finish(() => reject(new Error('انتهت صلاحية العملية. يرجى المحاولة مرة أخرى.')));
            return;
          default:
            return;
        }
      } catch (e) {
        if (signal?.aborted) {
          finish(() => reject(new DOMException('Aborted', 'AbortError')));
          return;
        }
        if (isJobNotFoundError(e) && Date.now() - startedAt < NOT_FOUND_GRACE_MS) {
          // `poll()` throws on non-2xx, so a backend 404 surfaces here as a
          // NotFoundError rather than as a `{ status: "not_found" }` payload.
          return;
        }
        finish(() => reject(e));
      }
    }, intervalMs);

    const timeoutHandle = setTimeout(() => {
      finish(() => reject(new Error('استغرق الأمر وقتاً طويلاً. يرجى المحاولة مرة أخرى.')));
    }, timeoutMs);
  });
}
