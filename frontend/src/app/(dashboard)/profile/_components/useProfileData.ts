"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserProfile } from "@/features/auth/api";
import { useAuthContext } from "@/contexts/auth-context";

export interface UserProfileData {
  id: string; email: string; username: string | null; name: string | null;
  avatar: string | null; phone: string | null; phoneVerified: boolean;
  emailVerified: boolean; gradeLevel: string | null; educationType: string | null;
  section: string | null; bio: string | null; country: string | null;
  city: string | null; gender: string | null; school: string | null;
  alternativePhone: string | null; dateOfBirth: string | null;
  studyGoal: string | null; subjectsTaught: string[] | null;
  experienceYears: string | null; mfaEnabled: boolean;
}

export interface UseProfileDataResult {
  profile: UserProfileData | null; isLoading: boolean; error: string | null; refetch: () => void;
}

/** User-scoped server state; Query owns dedupe, invalidation, stale data and GC. */
export function useProfileData(): UseProfileDataResult {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserProfile<UserProfileData>(),
    enabled: Boolean(userId), staleTime: 60_000, gcTime: 10 * 60_000,
  });
  return {
    profile: userId ? query.data ?? null : null,
    isLoading: Boolean(userId) && query.isPending,
    error: query.error ? "تعذر تحميل بيانات الملف الشخصي." : null,
    refetch: () => { void queryClient.invalidateQueries({ queryKey: ["user-profile", userId] }); },
  };
}
