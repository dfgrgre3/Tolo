'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/UserProvider';

export default function ClientLayoutProvider({ children }: { children: React.ReactNode }) {
  try {
    const router = useRouter();
    const auth = useAuth();
    const user = auth?.user;

    useEffect(() => {
      if (!user) return;
      // يمكن إضافة أي منطق خاص بالعميل هنا
    }, [user]);

    return <>{children}</>;
  } catch (error) {
    console.error('ClientLayoutProvider error:', error);
    return <>{children}</>; // Fallback rendering
  }
}
