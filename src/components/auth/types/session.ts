/**
 * Session-related types
 * 
 * ⚠️ NOTE: These types exist for backward compatibility only.
 * NextAuth has been removed from this project in favor of custom auth (@/lib/auth-service).
 * 
 * These types are kept for legacy endpoint compatibility.
 * See ENVIRONMENT_ISSUES.md and AUTH_STRUCTURE_CLEAN.md for details.
 */

/**
 * Session data structure (legacy NextAuth format)
 * @deprecated Use custom auth types from @/lib/auth-service instead
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

