"use client";

import { useEffect, useReducer } from "react";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { useAuthContext } from "@/contexts/auth-context";

/**
 * Matches `GetUserProfile`'s response exactly
 * (backend/internal/infrastructure/api/handlers/protected/user_profile_handler.go).
 *
 * `GET /api/auth/me` (the auth-context source) only returns identity fields
 * (id/email/name/username/avatar/role/status/emailVerified/phoneVerified) —
 * its `UserDTO` never carries bio, phone, country, gradeLevel, educationType,
 * section, dateOfBirth, or studyGoal. Reading those from `useAuthContext()`
 * always shows them blank, and — worse — makes a just-saved value visibly
 * revert after `refreshUser()`, since that reload hits the same endpoint.
 * This hook fetches the endpoint that actually returns them.
 */
export interface UserProfileData {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  gradeLevel: string | null;
  educationType: string | null;
  section: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  gender: string | null;
  school: string | null;
  alternativePhone: string | null;
  dateOfBirth: string | null;
  studyGoal: string | null;
  subjectsTaught: string[] | null;
  experienceYears: string | null;
  mfaEnabled: boolean;
}

export interface UseProfileDataResult {
  profile: UserProfileData | null;
  isLoading: boolean;
  error: string | null;
  /** Re-fetches — call after a successful `PATCH /api/users/profile`. */
  refetch: () => void;
}

/**
 * Module-level store shared by every consumer. The profile page used to fire
 * one GET per mounted consumer (identity card, completeness card, account
 * form, MFA card — four-plus parallel identical requests on every visit);
 * they now share a single in-flight request and its result. Data is keyed by
 * user id so a logout/login switch can never surface the previous user's
 * profile, and `refetch()` (post-save/avatar-change) publishes a fresh object
 * identity to all subscribers at once.
 */
interface ProfileStore {
  userId: string | null;
  data: UserProfileData | null;
  error: string | null;
  isInflight: boolean;
}

let store: ProfileStore = { userId: null, data: null, error: null, isInflight: false };

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function applyResult(userId: string, data: UserProfileData | null, error: string | null) {
  if (store.userId !== userId) return; // user switched mid-flight — drop it
  store = { userId, data, error, isInflight: false };
  notify();
}

function beginFetch(userId: string, keepExistingData: boolean) {
  store = {
    userId,
    data: keepExistingData ? store.data : null,
    error: null,
    isInflight: true,
  };
  notify();
  apiClient
    .get<UserProfileData>(apiRoutes.users.profile)
    .then((data) => applyResult(userId, data, null))
    .catch(() => applyResult(userId, null, "تعذر تحميل بيانات الملف الشخصي."));
}

function ensureLoaded(userId: string) {
  // Already loading / loaded / failed for this exact user — share that result.
  if (store.userId === userId && (store.isInflight || store.data || store.error)) return;
  beginFetch(userId, false);
}

function refetchProfile(userId: string | null) {
  if (!userId) return;
  beginFetch(userId, store.userId === userId);
}

export function useProfileData(): UseProfileDataResult {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const [, forceUpdate] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, [forceUpdate]);

  useEffect(() => {
    if (userId) ensureLoaded(userId);
  }, [userId]);

  const belongsToUser = userId !== null && store.userId === userId;

  return {
    profile: belongsToUser ? store.data : null,
    isLoading: belongsToUser ? store.data === null && store.error === null : userId !== null,
    error: belongsToUser ? store.error : null,
    refetch: () => refetchProfile(userId),
  };
}
