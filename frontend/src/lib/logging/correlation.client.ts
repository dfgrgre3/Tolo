import type { RequestContext } from './correlation.shared';

/** Browser-safe correlation facade. Request-local ALS is server-only. */
export function getRequestContext(): RequestContext | undefined {
  return undefined;
}
