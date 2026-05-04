/**
 * Ask Next.js to drop cached HTML for public routes after admin publishes content.
 * Server route: `POST /api/cache/revalidate` (session + allowlist).
 */
export async function requestPublicCacheRevalidation(
  paths: string[],
): Promise<void> {
  const res = await fetch("/api/cache/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ paths }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}
