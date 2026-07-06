import { cn } from '@/lib/utils';

interface ProfileInputProps {
  id: string;
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  error?: string;
}

export function ProfileInput({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  disabled,
  type = 'text',
  placeholder,
  hint,
  required,
  error
}: ProfileInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
        {required && <span className="text-red-400 text-xs">*</span>}
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn(
              'h-4 w-4 transition-colors',
              error ? 'text-red-400' : disabled ? 'text-slate-600' : 'text-slate-500 group-focus-within:text-indigo-400'
            )} />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-slate-800/50 border text-white',
            'placeholder:text-slate-600 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4',
            error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-indigo-500/50'
          )}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-400 flex items-center gap-1">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-red-400 shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500 flex items-start gap-1.5">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-slate-600 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}
