'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSummary } from '@/lib/server-data-fetch';
import { User } from '@/types/user';
import { PerformanceMetric } from './types';
import { rpgCommonStyles } from './constants';
import dynamic from 'next/dynamic';
import { Sparkles, Crown } from 'lucide-react';

// --- Preload skeleton for dynamic imports ---
import { Skeleton } from '@/components/ui/skeleton';

const LoadingFallback = () => (
  <div className="w-full h-48 bg-card/20 animate-pulse rounded-[2rem] border border-white/5" />
);

// --- Sections Imports (Optimized with Dynamic Loading) ---
const LevelProgressSection = dynamic(
  () => import('./sections/LevelProgressSection').then((mod) => mod.LevelProgressSection),
  { loading: () => <LoadingFallback /> }
);
const PerformanceDashboardSection = dynamic(
  () => import('./sections/PerformanceDashboardSection').then((mod) => mod.PerformanceDashboardSection),
  { loading: () => <LoadingFallback /> }
);
const ExamsSection = dynamic(
  () => import('./sections/ExamsSection').then((mod) => mod.ExamsSection),
  { loading: () => <LoadingFallback /> }
);
const AchievementsSection = dynamic(
  () => import('./sections/AchievementsSection').then((mod) => mod.AchievementsSection),
  { loading: () => <LoadingFallback /> }
);
import { UserHomeSkeleton } from './sections/UserHomeSkeleton';
import { SectionDivider } from './sections/SectionDivider';

// --- Legacy Sections (Dynamic) ---
const QuickLinksSectionEnhanced = dynamic(
  () => import('./sections/QuickLinksSectionEnhanced').then((mod) => mod.QuickLinksSectionEnhanced),
  { loading: () => <LoadingFallback /> }
);
const AnalyticsSection = dynamic(
  () => import('./sections/AnalyticsSection').then((mod) => mod.AnalyticsSection),
  { loading: () => <LoadingFallback /> }
);
const IntelligentRecommendationsSection = dynamic(
  () => import('./sections/IntelligentRecommendationsSection').then((mod) => mod.IntelligentRecommendationsSection),
  { loading: () => <LoadingFallback /> }
);
const LiveActivityFeedSection = dynamic(
  () => import('./sections/LiveActivityFeedSection').then((mod) => mod.LiveActivityFeedSection),
  { loading: () => <LoadingFallback /> }
);
const ProgressPredictionsSection = dynamic(
  () => import('./sections/ProgressPredictionsSection').then((mod) => mod.ProgressPredictionsSection),
  { loading: () => <LoadingFallback /> }
);
const TipsSection = dynamic(
  () => import('./sections/TipsSection').then((mod) => mod.TipsSection),
  { loading: () => <LoadingFallback /> }
);
const SocialFeaturesSection = dynamic(
  () => import('./sections/SocialFeaturesSection').then((mod) => mod.SocialFeaturesSection),
  { loading: () => <LoadingFallback /> }
);

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
      className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 space-y-8 lg:space-y-16 min-h-screen font-sans selection:bg-primary/30 selection:text-primary-foreground"
      dir="rtl"
    >
      {/* --- Premium Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-background overflow-hidden">
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
        <div className="relative overflow-hidden rounded-[3rem] bg-card/40 border border-border p-10 md:p-16 shadow-2xl backdrop-blur-2xl mb-12 ring-1 ring-border/5">
           {/* Inner glass reflection and decorations */}
           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />
           <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/30 rounded-full blur-[60px] pointer-events-none" />
           <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
           
           <div className="relative z-10 flex flex-col items-center text-center gap-10">
              <div className="space-y-8 max-w-4xl">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2 }}
                   className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-[0.2em] backdrop-blur-md shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                 >
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                    </span>
                    نظام المغامرة (RPG MODE) متصل
                 </motion.div>
                 
                 <div className="space-y-4">
                   <div className="flex items-center justify-center gap-3 mb-2">
                      <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                      <span className="text-amber-400 text-sm font-black uppercase tracking-widest">رتبة المحارب</span>
                   </div>
                   <h1 className="text-5xl md:text-8xl font-black text-foreground tracking-tighter leading-[1.1]">
                     مرحباً يا بطل، <br/>
                     <span className={`${rpgCommonStyles.neonText} drop-shadow-[0_0_35px_rgba(168,85,247,0.6)]`}>
                       {firstName}
                     </span>
                     <motion.span 
                       animate={{ rotate: [0, 14, -8, 14, -4, 10, 0, 0] }}
                       transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                       className="inline-block origin-bottom-right ml-4 text-6xl md:text-7xl"
                     >
                       ⚔️
                     </motion.span>
                   </h1>
                 </div>
                 
                 <p className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed max-w-3xl mx-auto">
                   ساحة المعركة بانتظارك! أكمل مهماتك اليومية (Daily Quests)، ارفع مستواك (Level Up)، وسيطر على لوحة الصدارة.
                 </p>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                 <div className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 shadow-inner">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="text-gray-300 font-bold text-lg">{todayDate}</span>
                 </div>
              </div>
           </div>

           {/* Hero Section Component Insert */}
           <div className="relative">
               <LevelProgressSection user={user} />
           </div>
        </div>
      </motion.header>

      {/* --- Main Vertical Layout --- */}
      <div className="flex flex-col max-w-7xl mx-auto lg:px-4">
         
         {/* Quick Links */}
         <motion.div variants={itemVariants} className="w-full">
            <QuickLinksSectionEnhanced />
         </motion.div>

         <SectionDivider label="إحصائيات القوة" />

         {/* Analytics & Performance */}
         <motion.div variants={itemVariants} className="w-full space-y-12">
            <PerformanceDashboardSection metrics={performanceMetrics || []} loading={metricsLoading} />
            <AnalyticsSection />
         </motion.div>

         <SectionDivider label="ساحة التدريب" />

         {/* Core Interaction Areas */}
         <motion.div variants={itemVariants} className="w-full space-y-12">
            <ExamsSection />
            <AchievementsSection />
         </motion.div>
         
         <SectionDivider label="مركز الاستخبارات" />

         {/* Intelligence & Recommendations */}
         <motion.div variants={itemVariants} className="flex flex-col gap-12 w-full">
            <IntelligentRecommendationsSection />
            <ProgressPredictionsSection />
            <TipsSection />
            <SocialFeaturesSection />
            <LiveActivityFeedSection />
         </motion.div>

      </div>

    </motion.div>
  );
}
