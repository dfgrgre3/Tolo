'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X, Sparkles } from 'lucide-react';

interface AchievementCelebrationProps {
  show: boolean;
  onCloseAction: () => void;
  badgeName: string;
}

export function AchievementCelebration({ show, onCloseAction, badgeName }: AchievementCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        onCloseAction();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [show, onCloseAction]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onCloseAction}
          />
          
          {/* Main Popup */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: 45 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50, rotateX: -45 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            className="relative pointer-events-auto w-[90%] max-w-md perspective-1000"
          >
            {/* 3D Glass Card effect */}
            <div className="relative bg-gradient-to-b from-amber-500/20 to-purple-900/40 p-1 rounded-3xl backdrop-blur-xl border border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),_0_0_40px_rgba(245,158,11,0.3)] transform-gpu overflow-hidden">
              
              {/* Shine effect */}
              <motion.div
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
              />

              <div className="relative bg-black/50 rounded-[22px] p-8 text-center flex flex-col items-center gap-6">
                
                {/* Close Button */}
                <button 
                  onClick={onCloseAction}
                  className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Trophy Icon with particles */}
                <div className="relative">
                  <motion.div
                    animate={{ rotateY: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="relative z-10 w-32 h-32 bg-gradient-to-br from-amber-300 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.6)]"
                  >
                    <Trophy className="w-16 h-16 text-white drop-shadow-lg" />
                  </motion.div>
                  
                  {/* Floating Stars */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0.5, 1.2, 0],
                        x: (Math.random() - 0.5) * 150,
                        y: (Math.random() - 0.5) * 150
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        delay: i * 0.4,
                        ease: "easeOut"
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
                    >
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                {/* Text Content */}
                <div className="space-y-2 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4" />
                    إنجاز جديد!
                  </motion.div>
                  
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl font-black text-white mt-4"
                  >
                    لقد حصلت على شارة
                  </motion.h2>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent transform-gpu mt-2"
                  >
                    {badgeName}
                  </motion.p>
                </div>

                {/* Action Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  onClick={onCloseAction}
                  className="relative z-10 w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:scale-105 active:scale-95"
                >
                  رائع! استمر في التقدم
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
