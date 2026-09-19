/**
 * Auth Domain Types & Models (P0-11)
 *
 * Single source of truth for all authentication domain types.
 */

import { UserRole } from "@thanawy/shared/types/enums";
import type { AccountStatus } from "@/lib/auth/account-status";
import type { SessionPresence } from "@/lib/api/redirect-loop-guard";

export { UserRole };
export type { AccountStatus, SessionPresence };

export interface AuthUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatar: string | null;
  role: UserRole;
  permissions: string[];
  phone: string | null;
  school: string | null;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status?: string;
  createdAt: string | null;
  lastLogin: string | null;

  // Profile fields
  alternativePhone?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  gradeLevel?: string | null;
  educationType?: string | null;
  section?: string | null;
  studyGoal?: string | null;
  subjectsTaught?: string[];
  experienceYears?: string | null;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "blocked" | "unavailable";

export type AuthLoginResult =
  | { status: "success"; success: true; requiresMfa?: false; challengeId?: null; error?: undefined }
  | { status: "mfa_required"; success: false; requiresMfa: true; challengeId: string | null; error?: undefined }
  | { status: "failure"; success: false; requiresMfa?: false; challengeId?: null; error: string; rateLimited: boolean; retryAfterMs: number | null };

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  status: AuthStatus;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  accountStatus: AccountStatus | null;
  login: (credentials: unknown) => Promise<AuthLoginResult>;
  verifyMfa: (code: string) => Promise<AuthLoginResult>;
  logout: () => Promise<void>;
  refreshUser: (options?: { force?: boolean }) => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isAdmin: () => boolean;
  isParent: () => boolean;
  isContentCreator: () => boolean;
}
