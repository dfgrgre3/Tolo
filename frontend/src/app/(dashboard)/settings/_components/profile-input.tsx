import { cn } from '@/lib/utils';

export function ProfileInput({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
  hint,
  required
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
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
              disabled ? 'text-slate-600' : 'text-slate-500 group-focus-within:text-indigo-400'
            )} />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-slate-800/50 border border-white/10 text-white',
            'placeholder:text-slate-600 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4'
          )}
        />
      </div>
      {hint && (
        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <span className="mt-0.5 h-1 w-1 rounded-full bg-slate-600 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}
