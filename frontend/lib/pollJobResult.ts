export type AIJobStatus = 'processing' | 'completed' | 'failed';

export interface AIJobResult<T> {
  status: AIJobStatus;
  result?: T;
  error?: string;
}

/**
 * Generic poller for AI job results.
 * @param jobId The job identifier returned by the async endpoint.
 * @param endpointBase Base endpoint path, e.g. '/api/ai/grade-essay/status'.
 * @param intervalMs Poll interval (default 1500ms).
 * @returns Promise that resolves with the result when completed, or rejects on failure.
 */
export async function pollAIJobResult<T>(
  jobId: string,
  endpointBase: string,
  intervalMs = 1500,
): Promise<T> {
  const poll = async (): Promise<AIJobResult<T>> => {
    const res = await fetch(`${endpointBase}/${jobId}`);
    if (!res.ok) {
      throw new Error(`Polling failed with status ${res.status}`);
    }
    const data = (await res.json()) as AIJobResult<T>;
    return data;
  };

  return new Promise<T>((resolve, reject) => {
    const handle = setInterval(async () => {
      try {
        const { status, result, error } = await poll();
        if (status === 'completed') {
          clearInterval(handle);
          resolve(result as T);
        } else if (status === 'failed') {
          clearInterval(handle);
          reject(new Error(error || 'Job failed'));
        }
        // otherwise continue polling
      } catch (e) {
        clearInterval(handle);
        reject(e);
      }
    }, intervalMs);
  });
}
