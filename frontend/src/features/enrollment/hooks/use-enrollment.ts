"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryProfiles } from "@/lib/query/query-profiles";
import { useAuth } from "@/hooks/use-auth";
import * as enrollmentApi from "../api/enrollment-gateway";
import type { EnrollResponse, UnenrollResponse } from "../domain/types";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const enrollmentKeys = {
  status: (courseId: string) => ["enrollment", "status", courseId] as const,
  eligibility: (courseId: string) =>
    ["enrollment", "eligibility", courseId] as const,
  myCourses: () => ["enrollment", "my-courses"] as const,
};

// ─── Hook: حالة التسجيل لكورس محدد ───────────────────────────────

export function useEnrollmentStatus(courseId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: enrollmentKeys.status(courseId),
    queryFn: () => enrollmentApi.fetchEnrollmentStatus(courseId),
    enabled: isAuthenticated && !!courseId,
    ...queryProfiles.dashboard,
  });
}

// ─── Hook: أهلية التسجيل ─────────────────────────────────────────

export function useEnrollmentEligibility(courseId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: enrollmentKeys.eligibility(courseId),
    queryFn: () => enrollmentApi.fetchEnrollmentEligibility(courseId),
    enabled: isAuthenticated && !!courseId,
    ...queryProfiles.dashboard,
  });
}

// ─── Hook: كورساتي ────────────────────────────────────────────────

export function useMyCourses() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: enrollmentKeys.myCourses(),
    queryFn: enrollmentApi.fetchMyCourses,
    enabled: isAuthenticated,
    ...queryProfiles.dashboard,
  });
}

// ─── Hook: التسجيل والإلغاء ───────────────────────────────────────

export function useEnrollMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<EnrollResponse, Error>({
    mutationFn: () => enrollmentApi.enrollInCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.status(courseId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myCourses() });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.eligibility(courseId) });
    },
  });
}

export function useUnenrollMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<UnenrollResponse, Error>({
    mutationFn: () => enrollmentApi.unenrollFromCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.status(courseId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myCourses() });
    },
  });
}
