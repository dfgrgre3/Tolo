"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { m, useInView } from "framer-motion";
import { StatCardProps } from "./types";
import { rpgCommonStyles } from "./constants";

const StatCard = ({ icon, value, label, color, delay = 0 }: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  // Extract number and suffix (e.g., "2000+" -> 2000, "+")
  const { endValue, suffix } = useMemo(() => {
    const stringValue = String(value);
    const match = stringValue.match(/(\d+)(.*)/);
    if (match) {
      return { endValue: parseInt(match[1], 10), suffix: match[2] };
    }
    return { endValue: 0, suffix: "" };
  }, [value]);

  useEffect(() => {
    if (isInView && endValue > 0) {
      let startTimestamp: number | null = null;
      const duration = 2000; // 2 seconds animation

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Easing function: easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        setDisplayValue(Math.floor(easeProgress * endValue));

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
    }
  }, [isInView, endValue]);

  // Determine specific color classes based on the 'color' prop
  // If it's a gradient string (starts with "bg-"), allow it, otherwise map key to gradient
  const colorClass = color.startsWith("from-") || color.startsWith("bg-") 
    ? color 
    : "from-primary to-purple-600"; // Default fallback

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden group ${rpgCommonStyles.card} flex flex-col items-center justify-center gap-4 text-center p-6`}
    >
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Icon Container */}
      <div className={`relative z-10 p-4 rounded-full bg-gradient-to-br ${colorClass} bg-opacity-10 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10`}>
        <div className="text-white drop-shadow-md">
           {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8" })}
        </div>
      </div>

      <div className="relative z-10 space-y-1">
        <div className="text-4xl font-black text-white tracking-tight drop-shadow-sm flex items-center justify-center gap-1">
          <span className="tabular-nums">{displayValue}</span>
          <span className="text-2xl text-primary/80">{suffix}</span>
        </div>
        <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
          {label}
        </p>
      </div>

      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent -mr-8 -mt-8 rounded-full blur-xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent -ml-8 -mb-8 rounded-full blur-xl" />
    </m.div>
  );
};

export default StatCard;
