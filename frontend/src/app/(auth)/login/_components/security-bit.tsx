'use client';

import { m } from 'framer-motion';

export function SecurityBit({ delay = 0 }: { readonly delay?: number }) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.2, 0],
        scale: [0.5, 1.2, 0.5],
        y: [-20, -100],
        x: [0, Math.random() * 40 - 20]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay,
        ease: "linear"
      }}
      className="w-1 h-1 bg-primary/40 rounded-full blur-[1px]"
    />
  );
}
