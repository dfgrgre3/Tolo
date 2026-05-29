'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { SecurityBit } from './security-bit';

const BACKGROUND_ELEMENTS = Array.from({ length: 20 }, (_, i) => ({
  id: `bg-element-${i}`,
}));

type BackgroundElementLayout = {
  id: string;
  left: number;
  top: number;
  delay: number;
  xOffset: number;
};

export function BackgroundLayers() {
  const [elements, setElements] = useState<BackgroundElementLayout[]>([]);

  useEffect(() => {
    setElements(
      BACKGROUND_ELEMENTS.map((element) => ({
        id: element.id,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        xOffset: Math.random() * 40 - 20,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <m.div
        animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(255,109,0,0.12),transparent_45%)]"
      />
      <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.08),transparent_45%)]" />

      <div className="absolute inset-0 overflow-hidden">
        {elements.map((element) => (
          <div key={element.id} className="absolute" style={{
            left: `${element.left}%`,
            top: `${element.top}%`
          }}>
            <SecurityBit delay={element.delay} xOffset={element.xOffset} />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")` }}
      />

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  );
}
