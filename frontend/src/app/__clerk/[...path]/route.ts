/**
 * Clerk Proxy Route — /__clerk/[...path]
 *
 * This route is required because NEXT_PUBLIC_CLERK_PROXY_URL is set to "/__clerk".
 * Clerk's browser SDK will send ALL frontend API requests (sign-in, sign-up, tokens, etc.)
 * to /__clerk/v1/... — so this handler must exist and proxy them correctly.
 *
 * We re-export everything from the canonical clerk-proxy route handler so there
 * is a single implementation to maintain.
 */
export {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  OPTIONS,
  runtime,
  preferredRegion,
  maxDuration,
} from '../../clerk-proxy/[...path]/route';
