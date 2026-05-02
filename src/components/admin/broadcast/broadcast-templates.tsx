"use client";

import { m } from "framer-motion";
import { BROADCAST_TEMPLATES, MessageTemplate } from "./types";

interface BroadcastTemplatesProps {
  selectedId: string;
  onSelect: (template: MessageTemplate) => void;
}

export function BroadcastTemplates({ selectedId, onSelect }: BroadcastTemplatesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
      {BROADCAST_TEMPLATES.map((t) => {
        const isSelected = selectedId === t.id;
        const Icon = t.icon;
        
        return (
          <m.button
            key={t.id}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(t)}
            className={`flex flex-col text-right p-6 rounded-[2.5rem] border-2 transition-all p-1 group overflow-hidden relative ${
              isSelected 
                ? 'border-primary bg-primary/10 shadow-[0_20px_60px_rgba(var(--primary),0.2)] scale-105 z-10' 
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
            }`}
          >
            {/* Background design */}
            <div className={`absolute -right-6 -bottom-6 p-4 opacity-[0.03] rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500 ${isSelected ? 'opacity-20 text-primary' : ''}`}>
               <Icon className="w-24 h-24" />
            </div>

            <div className={`p-4 rounded-2xl w-fit mb-6 ${isSelected ? 'bg-primary text-white shadow-[0_10px_20px_rgba(var(--primary),0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-primary'} transition-all`}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="space-y-1 relative z-10">
              <h4 className={`text-md font-black tracking-tighter ${isSelected ? 'text-primary' : 'text-white'}`}>{t.label}</h4>
              <p className="text-[10px] font-bold text-muted-foreground opacity-60 leading-relaxed line-clamp-2">{t.description}</p>
            </div>

            {isSelected && (
              <m.div 
                layoutId="broadcast-template-active"
                className="absolute inset-0 border-[2.5rem] border-primary/5 pointer-events-none rounded-[2.5rem]"
              />
            )}
          </m.button>
        );
      })}
    </div>
  );
}
