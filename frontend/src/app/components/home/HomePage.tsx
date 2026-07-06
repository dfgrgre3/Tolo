'use client';

import React from 'react';
import { User } from '@/types/user';
import { useAuth } from '@/hooks/use-auth';
import LandingPage from './LandingPage';
import { UserHome } from './UserHome';
import { Loader2 } from 'lucide-react';
import type { AuthUser } from '@/hooks/use-auth';

interface HomePageProps {
  user?: User;
}

export default function HomePage({ user }: HomePageProps) {
  const { user: authUser, isLoading } = useAuth();
  
  // Use the passed user prop or fall back to auth context
  // AuthUser is assignable to User as it has all required fields
  const currentUser = user || (authUser as User | null);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!currentUser) {
    return <LandingPage />;
  }

  // Show personalized home for authenticated users
  return <UserHome user={currentUser} />;
}
