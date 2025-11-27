"use client";

import React from "react";
import { useUnifiedAuth } from "@/contexts/auth-context";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/components/home/UserHome";
import { GuestHome } from "@/components/home/GuestHome";

interface HomeClientProps {
  summary: ProgressSummary | null;
}

export function HomeClient({ summary }: HomeClientProps) {
  const { user, isLoading: authLoading } = useUnifiedAuth();

  // If user is authenticated, show enhanced Dashboard with personalized content
  if (user) {
    return <UserHome user={user} summary={summary} />;
  }

  // If user is not authenticated, show marketing content
  return <GuestHome summary={summary} />;
}
