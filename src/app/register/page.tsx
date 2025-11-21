'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useUnifiedAuth();

  // Redirect authenticated users to home page immediately
  useEffect(() => {
    if (!isLoading && user) {
      // Use replace to prevent back navigation to register page
      router.replace('/');
      // Clear any registration-related data from localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('registrationData');
          localStorage.removeItem('registrationStep');
          localStorage.removeItem('pendingRegistration');
        } catch (_e) {
          // Ignore errors
        }
      }
    }
  }, [user, isLoading, router]);

  // Redirect to login page with register view
  useEffect(() => {
    if (!user && !isLoading) {
      router.replace('/login?view=register');
    }
  }, [user, isLoading, router]);



  // Don't render if user is authenticated (redirect will happen in useEffect)
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
        <p className="text-slate-300">جارٍ التوجيه...</p>
      </div>
    </div>
  );
}
