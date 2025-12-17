import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginFeedbackProps {
  feedback: {
    type: 'error' | 'success' | 'warning';
    message: string;
    details?: string;
  } | null;
}

export function LoginFeedback({ feedback }: LoginFeedbackProps) {
  if (!feedback) return null;

  return (
    <div className={`rounded-lg p-4 text-right ${feedback.type === 'error' 
      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
      : feedback.type === 'warning'
      ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200'
      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200'}`}>
      <p className="font-medium">{feedback.message}</p>
      {feedback.details && (
        <p className="mt-1 text-sm">{feedback.details}</p>
      )}
    </div>
  );
}
