'use client';

import { Wand2, Lock } from 'lucide-react';

interface LoginModeToggleProps {
  readonly loginMode: 'password' | 'magic-link';
  readonly setLoginMode: (mode: 'password' | 'magic-link') => void;
}

export function LoginModeToggle({ loginMode, setLoginMode }: LoginModeToggleProps) {
  return (
    <button
      type="button"
      onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
      className="flex items-center gap-3 text-[11px] font-black text-primary/70 hover:text-primary uppercase tracking-[0.15em] transition-all group px-4 py-2 rounded-xl bg-muted/40 hover:bg-primary/10 border border-border hover:border-primary/20"
    >
      {loginMode === 'password' ? (
        <>
          <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          <span>الدخول السريع</span>
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          <span>كلمة السر</span>
        </>
      )}
    </button>
  );
}
