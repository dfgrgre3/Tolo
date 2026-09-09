/**
 * Thin re-export of the generated API client into the frontend's alias space.
 *
 * The frontend's `tsconfig.json` uses the `@/*` → `src/*` alias. Importing
 * directly from `@thanawy/contracts` works, but the rest of the codebase
 * consistently uses `@/lib/...`. This file gives us an alias-local entry
 * point so existing imports don't have to change when the underlying
 * source migrates.
 *
 * Usage:
 *   import { client } from "@/lib/api/generated-client";
 *   const { data, error } = await client.GET("/api/auth/login", { ... });
 *
 * See `packages/contracts/README.md` for the full migration plan.
 */
import { apiClient } from "./api-client";
import { createContractsClient, getContractsBaseUrl } from "@thanawy/contracts";

/**
 * Keep OpenAPI's generated typing while routing requests through the same
 * fetch policy as the rest of the frontend (CSRF, retries, cache, idempotency,
 * credentials, and 401 handling).
 */
const sharedTransport: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const body = request.body && request.method !== "GET" && request.method !== "HEAD"
    ? await request.clone().arrayBuffer()
    : undefined;

  return apiClient.fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
};

export const client = createContractsClient(sharedTransport);
export { getContractsBaseUrl };
export { unwrapOpenApiPayload } from "@thanawy/contracts";
export type { paths, components, operations } from "@thanawy/contracts";
