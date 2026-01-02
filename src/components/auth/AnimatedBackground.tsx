'use client';

/**
 * 🌌 AnimatedBackground - خلفية متحركة للمصادقة
 * 
 * خلفية جميلة مع:
 * - Gradient orbs
 * - Floating particles
 * - Grid pattern
 * - Subtle animations
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'minimal' | 'particles' | 'mesh';
  className?: string;
}

export function AnimatedBackground({
  variant = 'default',
  className,
}: AnimatedBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 -z-10 overflow-hidden',
        'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        className
      )}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

      {/* Animated Orbs */}
      {variant !== 'minimal' && (
        <>
          <motion.div
            className="absolute h-[500px] w-[500px] rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-3xl"
            animate={{
              x: mousePosition.x * 50,
              y: mousePosition.y * 50,
            }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              top: '10%',
              left: '20%',
            }}
          />
          <motion.div
            className="absolute h-[400px] w-[400px] rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl"
            animate={{
              x: mousePosition.x * -30,
              y: mousePosition.y * -30,
            }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              bottom: '10%',
              right: '20%',
            }}
          />
          <motion.div
            className="absolute h-[300px] w-[300px] rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 blur-3xl"
            animate={{
              x: mousePosition.x * 20,
              y: mousePosition.y * 20,
            }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              top: '50%',
              left: '60%',
            }}
          />
        </>
      )}

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Particles */}
      {(variant === 'default' || variant === 'particles') && (
        <Particles count={30} />
      )}

      {/* Mesh Gradient */}
      {variant === 'mesh' && (
        <div className="absolute inset-0">
          <svg className="h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="mesh-pattern"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mesh-pattern)" />
          </svg>
        </div>
      )}

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}

// Floating Particles Component
function Particles({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/20"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 10,
          }}
        />
      ))}
    </div>
  );
}

export default AnimatedBackground;
