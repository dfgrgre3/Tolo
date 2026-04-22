"use client";

import { motion } from "framer-motion";
import { ROYAL_TEMPLATES, MessageTemplate } from "./types";

interface RoyalTemplatesProps {
  selectedId: string;
  onSelect: (template: MessageTemplate) => void;
}

export function RoyalTemplates({ selectedId, onSelect }: RoyalTemplatesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
      {ROYAL_TEMPLATES.map((t) => {
        const isSelected = selectedId === t.id;
        const Icon = t.icon;
        
        return (
          <motion.button
            key={t.id}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(t)}
            className={`flex flex-col text-right p-6 rounded-[2.5rem] border-2 transition-all p-1 group overflow-hidden relative ${
              isSelected 
                ? 'border-amber-500 bg-amber-500/10 shadow-[0_20px_60px_rgba(245,158,11,0.2)] scale-105 z-10' 
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            {/* Background design */}
            <div className={`absolute -right-6 -bottom-6 p-4 opacity-[0.03] rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500 ${isSelected ? 'opacity-20 text-amber-500' : ''}`}>
               <Icon className="w-24 h-24" />
            </div>

            <div className={`p-4 rounded-2xl w-fit mb-6 ${isSelected ? 'bg-amber-500 text-black shadow-[0_10px_20px_rgba(245,158,11,0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-amber-400'} transition-all`}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="space-y-1 relative z-10">
              <h4 className={`text-md font-black tracking-tighter ${isSelected ? 'text-amber-500' : 'text-white'}`}>{t.label}</h4>
              <p className="text-[10px] font-bold text-muted-foreground opacity-60 leading-relaxed line-clamp-2">{t.description}</p>
            </div>

            {isSelected && (
              <motion.div 
                layoutId="royal-template-active"
                className="absolute inset-0 border-[2.5rem] border-amber-500/5 pointer-events-none rounded-[2.5rem]"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
