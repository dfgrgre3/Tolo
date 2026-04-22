"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";


interface SectionDividerProps {
  icon?: LucideIcon;
  label?: string;
}

export function SectionDivider({ icon: Icon, label }: SectionDividerProps) {
  return (
    <div className="relative py-8 flex items-center justify-center overflow-hidden">
      {/* Background Line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Glowing Center */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {Icon ?
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="p-3 rounded-full bg-black border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-gray-400">
          
            <Icon className="w-5 h-5" />
          </motion.div> :

        <div className="h-2 w-2 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
        }
        
        {label &&
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 whitespace-nowrap">
            {label}
          </span>
        }
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
    </div>);

}