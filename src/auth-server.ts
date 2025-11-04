// Server-only auth configuration
import 'server-only';

import NextAuth, { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './lib/prisma'

// NextAuth v4 configuration
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // يمكن إضافة المزيد من مزودي المصادقة هنا
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    // يمكن تخصيص صفحات المصادقة هنا
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Create NextAuth instance
const nextAuth = NextAuth(authOptions)

// Export handler for API routes (NextAuth v4 pattern)
export default nextAuth

// Export auth function for server-side usage
export const auth = async () => {
  try {
    // For NextAuth v4, you would use getServerSession from next-auth/next
    // This is a placeholder that returns null to prevent errors
    return null
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

