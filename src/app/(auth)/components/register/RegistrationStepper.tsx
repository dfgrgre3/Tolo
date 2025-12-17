import { cn } from '@/lib/utils';
import { REGISTRATION_STEP_LABELS, REGISTRATION_STEPS } from './constants';
import type { RegistrationStep } from './types';

interface RegistrationStepperProps {
  currentStep: RegistrationStep;
}

export function RegistrationStepper({ currentStep }: RegistrationStepperProps) {
  const currentIndex = REGISTRATION_STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center gap-2">
      {REGISTRATION_STEPS.map((step, index) => (
        <div
          key={step}
          className={cn(
            'flex-1 rounded-full py-1 text-center text-xs font-medium transition-all',
            index < currentIndex
              ? 'bg-emerald-500 text-white'
              : index === currentIndex
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
          )}
        >
          {index + 1}. {REGISTRATION_STEP_LABELS[step]}
        </div>
      ))}
    </div>
  );
}
