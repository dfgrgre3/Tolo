/**
 * Browser-safe correlation entry point. Server request handlers that need
 * AsyncLocalStorage should import `correlation.server` explicitly.
 */
export { getRequestContext } from './correlation.client';
export type { RequestContext } from './correlation.shared';