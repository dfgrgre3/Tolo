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
export { client, getContractsBaseUrl } from "@thanawy/contracts";
export type { paths, components, operations } from "@thanawy/contracts";
