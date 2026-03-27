'use client';

import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { toast } from 'sonner';

export function NetworkMonitor() {
  const isOnline = useNetworkStatus();
  const prevStatusRef = useRef<boolean>(true);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize refs on mount
    prevStatusRef.current = isOnline;
    mountedRef.current = true;
  }, []); // Only runs once on mount

  useEffect(() => {
    if (!mountedRef.current) return;

    // Only trigger if status CHANGED
    if (prevStatusRef.current !== isOnline) {
      if (!isOnline) {
        toast.error('انقطع الاتصال بالإنترنت', {
          description: 'يرجى التحقق من اتصال الشبكة',
          id: 'network-status',
          duration: Infinity,
        });
      } else {
        toast.success('تمت استعادة الاتصال', {
          description: 'أنت متصل بالإنترنت الآن',
          id: 'network-status', // Replace the error toast
          duration: 4000,
        });
      }
      prevStatusRef.current = isOnline;
    }
  }, [isOnline]);

  return null;
}
