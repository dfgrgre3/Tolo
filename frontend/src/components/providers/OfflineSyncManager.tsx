'use client';

import { useEffect, useRef } from 'react';
import { useOfflineOutboxStore } from '@/hooks/use-offline-outbox-store';
import { safeFetch } from '@/lib/safe-client-utils';
import { toast } from 'sonner';
import { isCriticalError } from '@/lib/error-utils';

export function OfflineSyncManager() {
  const syncInProgress = useRef(false);

  useEffect(() => {
    const syncOutbox = async () => {
      if (syncInProgress.current) return;
      if (typeof window === 'undefined' || !navigator.onLine) return;

      const { pendingSubmissions, removeSubmission } = useOfflineOutboxStore.getState();
      if (pendingSubmissions.length === 0) return;

      syncInProgress.current = true;
      toast.loading('جاري مزامنة نتائج الامتحانات المحفوظة محلياً...', { id: 'offline-sync' });

      let successCount = 0;
      let failCount = 0;

      for (const sub of pendingSubmissions) {
        try {
          const { error } = await safeFetch('/api/exams/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: sub.userId,
              examId: sub.examId,
              score: sub.score,
              takenAt: sub.takenAt || undefined,
            }),
          }, null);

          if (!error) {
            removeSubmission(sub.id);
            successCount++;
          } else {
            if (isCriticalError(error)) {
              removeSubmission(sub.id);
              failCount++;
            } else {
              // Network error or server down, retry later
              break;
            }
          }
        } catch (err) {
          if (isCriticalError(err)) {
            removeSubmission(sub.id);
            failCount++;
          } else {
            break;
          }
        }
      }

      toast.dismiss('offline-sync');
      if (successCount > 0) {
        toast.success(`تمت مزامنة عدد ${successCount} من نتائج الامتحانات بنجاح!`);
      }
      if (failCount > 0) {
        toast.error(`فشلت مزامنة عدد ${failCount} من النتائج بسبب بيانات غير صالحة.`);
      }
      syncInProgress.current = false;
    };

    window.addEventListener('online', syncOutbox);
    syncOutbox(); // attempt on mount too

    return () => {
      window.removeEventListener('online', syncOutbox);
    };
  }, []);

  return null;
}
