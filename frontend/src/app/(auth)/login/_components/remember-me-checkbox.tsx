import { m } from 'framer-motion';
import { type UseFormRegisterReturn } from 'react-hook-form';

interface RememberMeCheckboxProps {
  readonly registration: UseFormRegisterReturn;
  readonly checked: boolean;
}

export function RememberMeCheckbox({ registration, checked }: RememberMeCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          {...registration}
          className="peer sr-only"
        />
        <div className="w-7 h-7 rounded-xl border-2 border-border bg-muted/40 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center group-hover:border-primary/50 shadow-inner">
          <m.div
            animate={{
              scale: checked ? 1 : 0,
              opacity: checked ? 1 : 0,
              rotate: checked ? 0 : -45
            }}
            className="w-3.5 h-3.5 rounded-md bg-primary shadow-[0_0_15px_rgba(255,109,0,0.6)]"
          />
        </div>
      </div>
      <span className="text-[11px] font-black text-muted-foreground group-hover:text-foreground uppercase tracking-[0.2em] transition-colors">
        تذكر هويتي
      </span>
    </label>
  );
}
