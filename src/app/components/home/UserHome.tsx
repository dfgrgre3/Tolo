'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ProgressSummary } from '@/lib/server-data-fetch';
import { User } from '@/types/api/auth';
import { PerformanceDashboardSection } from './sections/PerformanceDashboardSection';
import { QuickLinksSectionEnhanced } from './sections/QuickLinksSectionEnhanced';
import { StatusIndicatorsSection } from './sections/StatusIndicatorsSection';
import { AnalyticsSection } from './sections/AnalyticsSection';
import { IntelligentRecommendationsSection } from './sections/IntelligentRecommendationsSection';
import { LiveActivityFeedSection } from './sections/LiveActivityFeedSection';
import { ProgressPredictionsSection } from './sections/ProgressPredictionsSection';

import { ExamsSection } from './sections/ExamsSection';
import { TipsSection } from './sections/TipsSection';
import { AchievementsSection } from './sections/AchievementsSection';
import { AdvancedSearchSection } from './sections/AdvancedSearchSection';
import { SocialFeaturesSection } from './sections/SocialFeaturesSection';
import { FeaturesSection } from './sections/FeaturesSection';

interface UserHomeProps {
  user: User;
  summary: ProgressSummary | null;
}

export function UserHome({ user, summary }: UserHomeProps) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-primary">
            مرحباً، {user.name || 'طالبنا المجتهد'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            نتمنى لك يوماً دراسياً مثمراً! إليك ملخص أدائك اليوم.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full" suppressHydrationWarning>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* Advanced Search */}
      <AdvancedSearchSection />

      {/* Top Stats & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StatusIndicatorsSection />
          <QuickLinksSectionEnhanced />
        </div>
        <div className="lg:col-span-1">
          <TipsSection />
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Right Column (Main Content) */}
        <div className="xl:col-span-2 space-y-8">
          <PerformanceDashboardSection />
          <AnalyticsSection />
          <ExamsSection />
          <AchievementsSection />
          <SocialFeaturesSection />
        </div>

        {/* Left Column (Sidebar Content) */}
        <div className="space-y-8">
          <IntelligentRecommendationsSection />
          <ProgressPredictionsSection />
          <LiveActivityFeedSection />
        </div>
      </div>

      {/* Features Section */}
      <FeaturesSection />
    </div>
  );
}
