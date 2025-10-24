import { cn } from '@/lib/utils';
import { PASSWORD_STRENGTH_LEVELS } from './constants';
import type { PasswordRequirement } from './types';

interface RegistrationPasswordStrengthProps {
  score: number;
  label: string;
  requirements: PasswordRequirement[];
}

export function RegistrationPasswordStrength({
  score,
  label,
  requirements,
}: RegistrationPasswordStrengthProps) {
  const level =
    PASSWORD_STRENGTH_LEVELS.find(({ minScore }) => score >= minScore) ||
    PASSWORD_STRENGTH_LEVELS[PASSWORD_STRENGTH_LEVELS.length - 1];

  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-right shadow-inner dark:border-indigo-900/40 dark:bg-indigo-950/40">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-500 dark:text-slate-300">درجة الأمان</span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold',
            level.className,
          )}
        >
          {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/40">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            level.className,
          )}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <ul className="grid gap-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {requirements.map((requirement) => (
          <li
            key={requirement.label}
            className={cn(
              'flex items-center justify-end gap-2 rounded-lg border px-2 py-1.5',
              requirement.met
                ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60',
            )}
          >
            <span>{requirement.label}</span>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                requirement.met ? 'bg-emerald-500' : 'bg-slate-300',
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

