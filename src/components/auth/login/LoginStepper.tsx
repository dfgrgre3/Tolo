import { cn } from '@/lib/utils';
import { LOGIN_STEP_LABELS } from './constants';
import type { LoginStep } from './types';

interface LoginStepperProps {
  steps: LoginStep[];
  currentStepIndex: number;
  className?: string;
}

export function LoginStepper({ steps, currentStepIndex, className }: LoginStepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => (
        <div
          key={step}
          className={cn(
            'flex-1 rounded-full py-1 text-center text-xs font-medium transition-all',
            index < currentStepIndex
              ? 'bg-emerald-500 text-white'
              : index === currentStepIndex
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
          )}
        >
          {index + 1}. {LOGIN_STEP_LABELS[step] ?? step}
        </div>
      ))}
    </div>
  );
}
