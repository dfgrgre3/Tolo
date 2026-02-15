'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSummary } from '@/lib/server-data-fetch';
import { User } from '@/types/api/auth';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
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
      className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 min-h-screen"
      dir="rtl"
    >
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse-slow my-float" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen opacity-50" />
      </div>

      {/* --- Hero Header --- */}
      <motion.header variants={itemVariants} className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 border-b border-white/5 pb-6">
          <div className="space-y-2">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                نظام الألعاب نشط
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
               أهلاً، <span className={rpgCommonStyles.neonText}>{firstName}</span>
               <span className="inline-block animate-wave origin-bottom-right ml-2 text-4xl">👋</span>
             </h1>
             <p className="text-lg text-gray-400 max-w-2xl">
               جاهز لمغامرة اليوم؟ مهامك الجديدة بانتظارك لرفع مستوى خبرتك!
             </p>
          </div>
          
          <div className="text-left hidden md:block">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">اليوم</div>
            <div className="text-2xl font-bold text-gray-200">{todayDate}</div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-12">
            <LevelProgressSection user={user} />
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
