import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LoginFeedbackState } from './types';

interface LoginFeedbackProps {
  feedback: LoginFeedbackState | null;
}

export function LoginFeedback({ feedback }: LoginFeedbackProps) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.type === 'error';

  return (
    <Alert
      variant={isError ? 'destructive' : 'default'}
      className="border-0 bg-white/80 text-right text-slate-700 shadow dark:bg-slate-900/80 dark:text-slate-200"
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 text-red-500" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      )}
      <AlertTitle className="font-semibold">
        {isError ? '�?�?� �?���' : '�?�? �?�?�?�?�?'}
      </AlertTitle>
      <AlertDescription className="text-sm leading-6">
        {feedback.message}
      </AlertDescription>
    </Alert>
  );
}
