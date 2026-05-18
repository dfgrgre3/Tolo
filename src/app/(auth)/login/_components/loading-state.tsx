'use client';

import { m } from 'framer-motion';
import { ProcessingState } from './processing-state';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[600px]"
      >
        <ProcessingState />
      </m.div>
    </div>
  );
}
