'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSummary } from '@/lib/server-data-fetch';
import { User } from '@/types/user';
import { PerformanceMetric } from './types';
import { rpgCommonStyles } from './constants';
import { Sparkles, Crown } from 'lucide-react';

// --- Sections Imports ---
import { PerformanceDashboardSection } from './sections/PerformanceDashboardSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { ExamsSection } from './sections/ExamsSection';
import { AchievementsSection } from './sections/AchievementsSection';
import { LevelProgressSection } from './sections/LevelProgressSection';
import { UserHomeSkeleton } from './sections/UserHomeSkeleton';

// --- Legacy Sections (To be refactored later, keeping ensuring no break) ---
import { QuickLinksSectionEnhanced } from './sections/QuickLinksSectionEnhanced';
import { StatusIndicatorsSection } from './sections/StatusIndicatorsSection';
import { AnalyticsSection } from './sections/AnalyticsSection';
import { IntelligentRecommendationsSection } from './sections/IntelligentRecommendationsSection';
import { LiveActivityFeedSection } from './sections/LiveActivityFeedSection';
import { ProgressPredictionsSection } from './sections/ProgressPredictionsSection';
import { TipsSection } from './sections/TipsSection';
import { AdvancedSearchSection } from './sections/AdvancedSearchSection';
import { SocialFeaturesSection } from './sections/SocialFeaturesSection';

interface UserHomeProps {
  user: User;
  summary: ProgressSummary | null;
  performanceMetrics?: PerformanceMetric[];
  metricsLoading?: boolean;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 80, damping: 15 } 
  }
};

export function UserHome({ user, summary, performanceMetrics, metricsLoading }: UserHomeProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <UserHomeSkeleton />;

  const firstName = user.name?.split(' ')[0] || 'يا بطل';
  const todayDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 min-h-screen font-sans selection:bg-primary/30 selection:text-primary-foreground"
      dir="rtl"
    >
      {/* --- Premium Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#0A0A0F] overflow-hidden">
        {/* Dynamic Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,255,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,255,128,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,0,128,0.08),transparent_50%)]" />
        
        {/* Subtle Grid Mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />

        {/* Animated Floating Orbs using framer-motion */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3], x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute -bottom-40 right-1/3 w-[550px] h-[550px] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      {/* --- Premium Hero Header --- */}
      <motion.header variants={itemVariants} className="relative z-10">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-black/40 border border-white/10 p-8 shadow-2xl backdrop-blur-2xl mb-12 ring-1 ring-white/5">
           {/* Inner glass reflection */}
           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />
           <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/30 rounded-full blur-[50px] pointer-events-none" />
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div className="space-y-4 max-w-2xl">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2 }}
                   className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                 >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                    نظام الألعاب النشط متصل
                 </motion.div>
                 <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                   مرحباً بعودتك، <br className="hidden md:block"/>
                   <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-emerald-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                     {firstName}
                   </span>
                   <motion.span 
                     animate={{ rotate: [0, 14, -8, 14, -4, 10, 0, 0] }}
                     transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                     className="inline-block origin-bottom-right ml-3 text-5xl"
                   >
                     👋
                   </motion.span>
                 </h1>
                 <p className="text-lg md:text-xl text-gray-300 font-medium leading-relaxed drop-shadow-sm">
                   مغامرة جديدة بانتظارك اليوم! استكشف المهام، ارفع مستواك، وتصدر قائمة الشرف.
                 </p>
              </div>
              
              <div className="text-right hidden md:flex flex-col items-end">
                <div className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  تاريخ اليوم
                </div>
                <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner text-2xl font-black text-white/90">
                  {todayDate}
                </div>
              </div>
           </div>

           {/* Hero Section Component Insert */}
           <div className="relative">
               <LevelProgressSection user={user} />
           </div>
        </div>
      </motion.header>

      {/* --- Main Grid Layout --- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
         
         {/* Main Content Area (9 Columns) */}
         <div className="xl:col-span-9 space-y-8 w-full order-2 xl:order-1">
            
            {/* Quick Actions & Search */}
            <motion.div variants={itemVariants} className="space-y-6">
              <AdvancedSearchSection />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <StatusIndicatorsSection />
                 <QuickLinksSectionEnhanced />
              </div>
            </motion.div>

            {/* Performance & Analytics */}
            <motion.div variants={itemVariants}>
              <PerformanceDashboardSection metrics={performanceMetrics || []} loading={metricsLoading} />
            </motion.div>

            {/* Battle Arena (Exams) */}
            <motion.div variants={itemVariants}>
              <ExamsSection />
            </motion.div>
            
            {/* Achievements */}
            <motion.div variants={itemVariants}>
               <AchievementsSection />
            </motion.div>
            
             <motion.div variants={itemVariants}>
              <AnalyticsSection />
            </motion.div>

         </div>

         {/* Sidebar (3 Columns) */}
         <aside className="xl:col-span-3 space-y-6 w-full order-1 xl:order-2 sticky top-24">
            <motion.div variants={itemVariants} className="space-y-6">
               <IntelligentRecommendationsSection />
               <ProgressPredictionsSection />
               <TipsSection />
               <LiveActivityFeedSection />
               <SocialFeaturesSection />
            </motion.div>
         </aside>

      </div>

      {/* --- Footer Features --- */}
      <motion.div variants={itemVariants} className="pt-16 pb-8 border-t border-white/5">
         <FeaturesSection />
      </motion.div>

    </motion.div>
  );
}
