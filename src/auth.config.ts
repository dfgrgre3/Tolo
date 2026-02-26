import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
        error: '/login', // Error code passed in query string as ?error=
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const PROTECTED_PATHS = ['/account', '/profile', '/settings', '/dashboard']; // etc

            const isProtected = PROTECTED_PATHS.some(path => nextUrl.pathname.startsWith(path));
            if (isProtected) {
                if (isLoggedIn) return true;
                return false; // Redirect to unauthenticated page
            } else if (isLoggedIn) {
                if (nextUrl.pathname.startsWith('/login')) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.sub = user.id;
            }
            return token;
        }
    },
    providers: [], // Add providers with an empty array for now
    secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
} satisfies NextAuthConfig;
