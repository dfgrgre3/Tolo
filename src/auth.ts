// Client-safe auth exports
// Re-export from auth-server for API routes that need server-only code
// For client components, use client-side auth hooks instead
// Note: next-auth has been removed, using custom auth system

// Re-export auth function from auth-server (server-only)
export { default, auth } from './auth-server';

// Compatibility exports for signIn and signOut
// Note: These are placeholders for backward compatibility
// Actual authentication should use the auth API routes directly
export const signIn = async (...args: any[]) => {
  // Placeholder for backward compatibility
  // Use /api/auth/login API route instead
  // Note: logger not used here as this is a client-safe export
  return { error: 'Not implemented. Use /api/auth/login API route instead.', ok: false };
}

export const signOut = async (...args: any[]) => {
  // Placeholder for backward compatibility
  // Use /api/auth/logout API route instead
  // Note: logger not used here as this is a client-safe export
  return { error: 'Not implemented. Use /api/auth/logout API route instead.', ok: false };
}
