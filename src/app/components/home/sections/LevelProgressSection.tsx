'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types/user';
import { Trophy, Zap, Crown, Target } from 'lucide-react';

interface LevelProgressProps {
  user: User;
}

export const LevelProgressSection = ({ user }: LevelProgressProps) => {
   // Gamification Data Logic with Fallbacks
  const level = user.level || 1;
  const currentXP = Number(user.totalXP) || 0;
  const nextLevelXP = level * 1000; // Each level requires 1000 XP
  const progressPercent = Math.min((currentXP / nextLevelXP) * 100, 100);
  const rankTitle = (user.rank as string) || "مبتدئ طموح";
  const remainingXP = Math.max(nextLevelXP - currentXP, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:bg-black/50 hover:border-white/20"
    >
      {/* Decorative Background Effects (RPG Style) */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl mix-blend-overlay animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl mix-blend-overlay"></div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* Avatar & Rank Info */}
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto text-center sm:text-right">
          <div className="relative group">
            {/* Avatar Ring Progress */}
            <svg className="h-24 w-24 -rotate-90 transform text-transparent" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" className="text-white/20" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="currentColor"
                strokeWidth="3"
                className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                fill="none"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * progressPercent) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            
            {/* Actual Avatar Image */}
            <div className="absolute inset-2 overflow-hidden rounded-full border-2 border-white/50 shadow-inner bg-white/10">
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random&color=fff&bold=true`} 
                alt={user.name || 'User'} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            {/* Level Badge */}
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-600 text-sm font-black text-yellow-900 shadow-lg ring-2 ring-violet-900 transform rotate-12 group-hover:rotate-0 transition-all duration-300">
              {level}
            </div>
          </div>
          
          <div className="text-white space-y-1">
            <h2 className="text-2xl font-bold flex flex-col sm:flex-row items-center gap-2">
              <span className="drop-shadow-md">{user.name || 'طالب مجتهد'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-yellow-200 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                <Crown className="h-3 w-3 text-yellow-400" />
                {rankTitle}
              </span>
            </h2>
            <p className="text-base text-indigo-100/90 font-medium">
              مغامرتك التعليمية مستمرة! 🚀
            </p>
          </div>
        </div>

        {/* XP Progress Bar Section */}
        <div className="flex-1 w-full lg:max-w-xl bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">نقاط الخبرة (XP)</span>
              <span className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                {currentXP.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
               <span className="text-xs text-indigo-200">الهدف التالي</span>
               <div className="text-sm font-semibold text-white flex items-center gap-1 justify-end">
                 <Target className="h-3 w-3" />
                 {nextLevelXP.toLocaleString()}
               </div>
            </div>
          </div>
          
          {/* 3D Progress Bar Container */}
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-900/50 shadow-inner ring-1 ring-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative h-full rounded-full bg-gradient-to-l from-yellow-400 via-orange-500 to-pink-600 shadow-[0_0_15px_rgba(251,146,60,0.5)]"
            >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 -skew-x-12 animate-[shimmer_2s_infinite]"></div>
            </motion.div>
          </div>
          
          <div className="mt-3 flex justify-between items-center text-xs">
            <span className="text-indigo-200/80 font-medium">تبقى {remainingXP} نقطة للمستوى {level + 1}</span>
            <span className="text-yellow-300 font-bold">{Math.round(progressPercent)}%</span>
          </div>
        </div>
      
      </div>
    </motion.div>
  );
};
