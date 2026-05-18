import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex flex-col justify-center items-center h-64 gap-4" role="status" aria-live="polite">
      <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
      <p className="text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
    </div>
  );
}
