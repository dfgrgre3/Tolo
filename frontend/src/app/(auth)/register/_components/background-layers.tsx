'use client';

import { m } from 'framer-motion';

export function BackgroundLayers() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <m.div
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full"
      />
      <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")` }}
      />
    </div>
  );
}
