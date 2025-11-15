import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface LoginSuccessStepProps {
  onContinue: () => void;
}

export function LoginSuccessStep({ onContinue }: LoginSuccessStepProps) {
  return (
    <div className="space-y-6 text-right">
      <div className="rounded-2xl bg-emerald-500/10 p-6 text-emerald-700 shadow-inner dark:bg-emerald-500/15 dark:text-emerald-200">
        <p className="flex items-center justify-end gap-2 text-lg font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          �?�? �?�?�?�?�? �?�?�?�?�?�? �?�?�?�?�?
        </p>
        <p className="mt-2 text-sm leading-6">
          �?�?�?�?�?�?�? �?�?�?�?�?�?�?�? �?�?�? �?�?�?�? �?�?�?�?�?�? �?�?�?�?�?�?�? �?���?�? �?�?�?�?�?�?�?�?. �?�?�?�?�? �?�?�?�?�?
          �?���? �?�?�?�?�?���? �?��?�?�?.
        </p>
      </div>
      <Button
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={onContinue}
      >
        �?�?�?�?�?�?�?�? �?�?�? �?�?�?�? �?�?�?�?�?�?
      </Button>
    </div>
  );
}
