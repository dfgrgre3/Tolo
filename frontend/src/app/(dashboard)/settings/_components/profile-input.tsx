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
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        {required && <span className="text-destructive text-xs">*</span>}
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn(
              'h-4 w-4 transition-colors',
              error ? 'text-destructive' : disabled ? 'text-muted-foreground' : 'text-muted-foreground group-focus-within:text-ring'
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
            'w-full py-3.5 rounded-2xl bg-background border text-foreground',
            'placeholder:text-muted-foreground transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4',
            error ? 'border-destructive/50 focus:ring-destructive/50 focus:border-destructive/50' : 'border-input focus:border-ring'
          )}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive flex items-center gap-1">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}
