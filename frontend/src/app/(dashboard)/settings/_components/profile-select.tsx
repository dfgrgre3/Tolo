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
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-300">{label}</label>
      <div className="relative group">
        {Icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon className={cn(
              'h-4 w-4 transition-colors',
              disabled ? 'text-slate-600' : 'text-slate-500 group-focus-within:text-indigo-400'
            )} />
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full py-3.5 rounded-2xl bg-slate-800/50 border border-white/10 text-white appearance-none',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            Icon ? 'pr-11 pl-4' : 'px-4'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-800">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
