// Server-only auth configuration
// Note: This file previously used next-auth, but we've migrated to a custom auth system
// This file is kept for backward compatibility but no longer uses next-auth
import 'server-only';

// Removed next-auth imports - using custom auth system instead
// import NextAuth, { NextAuthOptions } from 'next-auth'
// import { PrismaAdapter } from '@next-auth/prisma-adapter'
// import { prisma } from './lib/prisma'

// Export auth function for server-side usage
// Returns null since we're using custom auth system (see src/lib/auth-service.ts)
export const auth = async () => {
  try {
    // Using custom auth system - see src/lib/auth-service.ts
    // This function is kept for backward compatibility
    return null
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Placeholder export for backward compatibility
export default auth

