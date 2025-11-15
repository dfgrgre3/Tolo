/**
 * Server-only loader for security logger
 * This file must only run on the server - prevent browser bundling
 * Note: We use runtime checks instead of 'server-only' to prevent build-time errors
 */

/**
 * Load security logger on the server
 * This function is only called from server-side code
 */
export async function loadSecurityLogger() {
  // Runtime check to ensure this only runs on the server
  if (typeof window !== 'undefined') {
    throw new Error('Security logger loader can only be used on the server');
  }
  
  const { securityLogger } = await import('@/lib/security-logger');
  return securityLogger;
}

