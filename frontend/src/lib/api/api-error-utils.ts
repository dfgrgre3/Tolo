/**
 * Normalizes API error payloads from Go (`gin.H{"error": "..."}`) and similar shapes.
 *
 * SECURITY: Only extracts known-safe string fields (`error` / `message`) from
 * structured JSON responses. This prevents raw server internals (stack traces,
 * SQL queries, file paths) from leaking into client-visible error messages.
 */
export function readApiErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;

  // Only allow short, human-readable strings — reject anything that looks like
  // a stack trace, file path, or connection string (heuristic: contains newlines
  // or is suspiciously long).
  const isClientSafeString = (s: string): boolean =>
    s.trim().length > 0 &&
    s.length <= 300 &&
    !s.includes("\n") &&
    !s.includes("\\") &&
    !/https?:\/\/[^/]+:[^/]+@/.test(s); // No credential-bearing URLs

  if (typeof o.error === "string" && isClientSafeString(o.error)) return o.error.trim();
  if (typeof o.message === "string" && isClientSafeString(o.message)) return o.message.trim();
  return fallback;
}

/**
 * Throws Error with a safe, sanitized message when `response` is not ok.
 *
 * SECURITY: Plain-text server responses are never forwarded to the client because
 * they may contain internal file paths, SQL errors, or microservice addresses.
 * Only structured JSON with known-safe fields is surfaced; everything else falls
 * back to the caller-supplied `fallback` string.
 */
export async function throwIfApiError(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return;

  // Default message uses only the HTTP status code — never raw server text.
  let msg = `${fallback} (${response.status})`;

  try {
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await response.json();
      // readApiErrorMessage applies its own safety filter.
      msg = readApiErrorMessage(body, msg);
    }
    // SECURITY: Plain-text responses are intentionally ignored here.
    // We do NOT forward response.text() to the client because it can contain
    // raw server internals (Go panic messages, SQL errors, file paths).
    // The `fallback` argument already provides a user-friendly description.
  } catch {
    /* keep msg — parse failure is safe to swallow */
  }

  throw new Error(msg);
}

export async function readJsonOrThrow<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  await throwIfApiError(response, fallback);
  return (await response.json()) as T;
}
