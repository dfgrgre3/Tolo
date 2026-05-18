import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  error: string;
  onClose: () => void;
}

export function ErrorBanner({ error, onClose }: ErrorBannerProps) {
  return (
    <div
      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-200"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <p>{error}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="mr-auto text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
        aria-label="إغلاق رسالة الخطأ"
      >
        ✕
      </Button>
    </div>
  );
}
