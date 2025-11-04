// Client-safe auth exports
// Re-export from auth-server for API routes that need server-only code
// For client components, use client-side auth hooks instead

export { default } from './auth-server';
export { authOptions } from './auth-server';

// Client-safe auth function (returns null for client components)
export const auth = async () => {
  // This is a client-safe version that returns null
  // Server components should use auth-server.ts directly
  return null;
}

// Export signIn and signOut functions (compatibility exports)
export const signIn = async (...args: any[]) => {
  // Placeholder - actual implementation would use NextAuth's signIn
  return { error: 'Not implemented', ok: false }
}

export const signOut = async (...args: any[]) => {
  // Placeholder - actual implementation would use NextAuth's signOut
  return { error: 'Not implemented', ok: false }
}
