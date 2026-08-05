'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    const checkImpersonation = () => {
      if (typeof window === 'undefined') return;
      const isImpersonate = document.cookie
        .split(';')
        .some((item) => item.trim().startsWith('impersonate_csrf_token='));
      setImpersonating(isImpersonate);
    };

    checkImpersonation();
    const interval = setInterval(checkImpersonation, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStopImpersonating = async () => {
    setIsStopping(true);
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        window.location.href = '/admin'; // Redirect back to admin dashboard
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      window.location.reload();
    } finally {
      setIsStopping(false);
    }
  };

  if (!impersonating) return null;

  return (
    <div className="bg-amber-600 text-white py-2.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-3 z-50 sticky top-0 border-b border-amber-700 shadow-md">
      <ShieldAlert className="h-5 w-5 text-amber-100" />
      <span>أنت تقوم حالياً بتقمص حساب طالب للتجربة والمعاينة.</span>
      <Button
        variant="secondary"
        size="sm"
        disabled={isStopping}
        onClick={handleStopImpersonating}
        className="bg-white text-amber-700 hover:bg-amber-50 font-bold"
      >
        {isStopping ? 'جاري الإنهاء...' : 'إنهاء التقمص والتراجع'}
      </Button>
    </div>
  );
}
