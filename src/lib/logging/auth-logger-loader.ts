/**
 * Server-only loader for auth logger
 * This file must only run on the server - prevent browser bundling
 * Note: We use runtime checks instead of 'server-only' to prevent build-time errors
 */

/**
 * Load auth logger on the server
 * This function is only called from server-side code
 */
export async function loadAuthLogger() {
  // Runtime check to ensure this only runs on the server
  if (typeof window !== 'undefined') {
    // Return a no-op logger on client side
    return {
      info: async () => {},
      warn: async () => {},
      error: async () => {},
      debug: async () => {},
    };
  }
  
  const { authLogger } = await import('./auth-logger');
  return authLogger;
}

