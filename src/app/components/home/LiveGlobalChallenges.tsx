'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Timer, ChevronLeft } from 'lucide-react';

const CHALLENGES = [
  { id: 1, title: 'تحدي الفيزياء الحالية', count: 54, type: 'live', icon: Zap },
  { id: 2, title: 'أفضل وقت مذاكرة اليوم', count: 120, type: 'rank', icon: Timer },
  { id: 3, title: 'معركة الكيمياء القادمة', count: 32, type: 'event', icon: Users },
];

export function LiveGlobalChallenges() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CHALLENGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const challenge = CHALLENGES[index];
  const Icon = challenge.icon;

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl border-y border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            مباشر الآن
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-white font-bold text-sm truncate">{challenge.title}</span>
                <span className="text-primary font-black text-sm shrink-0">+{challenge.count} طالب</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all group shrink-0">
          <span className="text-xs text-gray-400 group-hover:text-white transition-colors">انضم الآن</span>
          <ChevronLeft className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );
}
