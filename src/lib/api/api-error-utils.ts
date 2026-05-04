/**
 * Normalizes API error payloads from Go (`gin.H{"error": "..."}`) and similar shapes.
 */
export function readApiErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  return fallback;
}

/** Throws Error with server message when `response` is not ok. */
export async function throwIfApiError(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return;
  let msg = `${fallback} (${response.status})`;
  try {
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await response.json();
      msg = readApiErrorMessage(body, msg);
    } else {
      const text = await response.text();
      if (text.trim()) msg = text.slice(0, 500);
    }
  } catch {
    /* keep msg */
  }
  throw new Error(msg);
}
