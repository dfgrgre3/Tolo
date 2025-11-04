/**
 * Session-related types
 * Type definitions for NextAuth session management
 */

/**
 * Session data structure from NextAuth
 */
export interface SessionData {
  /** Authenticated user information */
  user: {
    /** User unique identifier */
    id: string;
    /** User email address */
    email: string;
    /** User display name */
    name?: string;
    /** User profile image URL */
    image?: string;
  };
  /** Session expiration timestamp */
  expires: string;
}

/**
 * Props for SessionProviderWrapper component
 */
export interface SessionProviderProps {
  /** Current session data (null if not authenticated) */
  session: SessionData | null;
  /** Child components to render */
  children: React.ReactNode;
}

