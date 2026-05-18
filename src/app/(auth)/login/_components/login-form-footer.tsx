'use client';

import Link from 'next/link';

export function LoginFormFooter() {
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-gray-500 text-sm font-medium">
        ليس لديك حساب؟{' '}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-black transition-colors underline underline-offset-8 decoration-primary/20 hover:decoration-primary"
        >
          انضم لعالم تولو
        </Link>
      </p>
      <div className="flex items-center gap-4 opacity-30 hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">End-to-End Encryption Enabled</span>
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      </div>
    </div>
  );
}
