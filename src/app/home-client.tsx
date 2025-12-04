"use client";

import React from "react";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/components/home/UserHome";
import { GuestHome } from "@/components/home/GuestHome";

import { User as ApiUser } from "@/types/api/auth";

interface HomeClientProps {
  summary: ProgressSummary | null;
}

export function HomeClient({ summary }: HomeClientProps) {
  const { user, isLoading: authLoading } = useUnifiedAuth();

  // If user is authenticated, show enhanced Dashboard with personalized content
  if (user) {
    const apiUser: ApiUser = {
        id: user.id,
        email: user.email,
        name: user.name || null,
        role: user.role,
        emailVerified: user.emailVerified ?? false,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        lastLogin: user.lastLogin || null,
        provider: user.provider,
    };
    return <UserHome user={apiUser} summary={summary} />;
  }

  // If user is not authenticated, show marketing content
  return <GuestHome summary={summary} />;
}
