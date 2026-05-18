'use client';

import { m } from 'framer-motion';
import { type UseFormRegisterReturn, type UseFormGetValues } from 'react-hook-form';

interface RememberMeCheckboxProps {
  registration: UseFormRegisterReturn;
  getValues: UseFormGetValues<any>;
}

export function RememberMeCheckbox({ registration, getValues }: RememberMeCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          {...registration}
          className="peer sr-only"
        />
        <div className="w-7 h-7 rounded-xl border-2 border-white/10 bg-white/5 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center group-hover:border-primary/50 shadow-inner">
          <m.div
            animate={{
              scale: getValues('rememberMe') ? 1 : 0,
              opacity: getValues('rememberMe') ? 1 : 0,
              rotate: getValues('rememberMe') ? 0 : -45
            }}
            className="w-3.5 h-3.5 rounded-md bg-primary shadow-[0_0_15px_rgba(255,109,0,0.6)]"
          />
        </div>
      </div>
      <span className="text-[11px] font-black text-gray-500 group-hover:text-gray-300 uppercase tracking-[0.2em] transition-colors">
        تذكر هويتي
      </span>
    </label>
  );
}
