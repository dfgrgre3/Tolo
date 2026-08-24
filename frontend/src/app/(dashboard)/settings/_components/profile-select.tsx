import { cn } from '@/lib/utils';

export function ProfileSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  options
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon className={cn(
              'h-4 w-4 transition-colors',
              disabled ? 'text-muted-foreground/60' : 'text-muted-foreground group-focus-within:text-primary'
            )} />
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-background border border-input text-foreground appearance-none',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
