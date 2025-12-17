"use client";

import React from "react";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/app/components/home/UserHome";


import { User as ApiUser } from "@/types/api/auth";

interface HomeClientProps {
  summary: ProgressSummary | null;
}

export function HomeClient({ summary }: HomeClientProps) {
  const { user, isLoading: authLoading } = useUnifiedAuth();

  // Create user object - use authenticated user data or guest defaults
  const apiUser: ApiUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name || null,
        role: user.role,
        emailVerified: user.emailVerified ?? false,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        lastLogin: user.lastLogin || null,
        provider: user.provider,
      }
    : {
        id: 'guest',
        email: '',
        name: 'زائر',
        role: 'STUDENT',
        emailVerified: false,
        twoFactorEnabled: false,
        lastLogin: null,
        provider: 'local',
      };

  // Show UserHome for all users (authenticated and guests)
  return <UserHome user={apiUser} summary={summary} />;
}
