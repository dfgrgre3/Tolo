"use client";

import React, { useMemo } from "react";
import { StatCardProps } from "./types";
import { rpgCommonStyles } from "./styles";

const StatCard = ({ icon, value, label, color }: StatCardProps) => {
  const { displayValue, suffix } = useMemo(() => {
    const stringValue = String(value);
    const match = stringValue.match(/(\d+)(.*)/);
    if (match) {
      return { displayValue: parseInt(match[1]!, 10), suffix: match[2] };
    }
    return { displayValue: 0, suffix: "" };
  }, [value]);

  // Determine specific color classes based on the 'color' prop
  // If it's a gradient string (starts with "bg-"), allow it, otherwise map key to gradient
  const colorClass = color.startsWith("from-") || color.startsWith("bg-") 
    ? color 
    : "from-primary to-purple-600"; // Default fallback

  return (
    <div
      className={`relative overflow-hidden group ${rpgCommonStyles.card} flex flex-col items-center justify-center gap-4 text-center p-6`}
    >
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10`} />
      
      {/* Icon Container */}
      <div className={`relative z-10 p-4 rounded-full bg-gradient-to-br ${colorClass} bg-opacity-10 shadow-lg ring-1 ring-white/10`}>
        <div className="text-white drop-shadow-md">
           {React.cloneElement(icon, { className: "w-8 h-8" })}
        </div>
      </div>

      <div className="relative z-10 space-y-1">
        <div className="text-4xl font-black text-white tracking-tight drop-shadow-sm flex items-center justify-center gap-1">
          <span className="tabular-nums">{displayValue}</span>
          <span className="text-2xl text-primary/80">{suffix}</span>
        </div>
        <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300">
          {label}
        </p>
      </div>

      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent -mr-8 -mt-8 rounded-full blur-xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent -ml-8 -mb-8 rounded-full blur-xl" />
    </div>
  );
};

export default StatCard;
