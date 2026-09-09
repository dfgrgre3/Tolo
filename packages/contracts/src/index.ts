/**
 * Public surface of @thanawy/contracts.
 *
 * Consumers should import:
 *   import { client, type paths, type components } from "@thanawy/contracts";
 *
 * Do NOT import from "./generated/api" directly — the file is regenerated
 * on every `npm run generate:api-types` and its export shape may grow.
 */
export { client } from "./client";
export { getContractsBaseUrl } from "./backend-url";
export { unwrapOpenApiPayload } from "./application-envelope";
export type { paths, components, operations } from "./generated/api";
