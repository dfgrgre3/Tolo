'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { User } from '@/types/user';
import { ProgressSummary } from '@/types/gamification';
import { useGamification } from '@/hooks/use-gamification';

import { useDashboardResource } from './hooks/useDashboardResource';
import { SectionDivider } from './shared/SectionDivider';
import { AmbientBackground } from './shared/AmbientBackground';
import { DashboardHeader } from './shared/DashboardHeader';
import {
  AchievementsSection,
  AnalyticsSection,
  CoursesProgressSection,
  ExamsSection,
  FeaturesSection,
  IntelligentRecommendationsSection,
  LiveActivityFeedSection,
  PerformanceDashboardSection,
  ProgressPredictionsSection,
  QuickLinksSectionEnhanced,
  RecommendedForYouSection,
  SocialFeaturesSection,
  StatusIndicatorsSection,
  TipsSection,
} from './sections/registry';

interface UserHomeProps {
  user: User;
}

export function UserHome({ user }: UserHomeProps) {
  const { userProgress } = useGamification({ userId: user.id });
  const progressSummaryUrl = `/api/progress/summary?userId=${encodeURIComponent(user.id)}`;
  const { data: summary } = useDashboardResource<ProgressSummary>(progressSummaryUrl, 'ملخص التقدم');

  return (
    <div
      className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 space-y-8 lg:space-y-16 min-h-screen font-sans selection:bg-primary/30 selection:text-primary-foreground"
      dir="rtl">

      <AmbientBackground />

      <div>
        <DashboardHeader
          user={user}
          currentStreak={userProgress?.currentStreak ?? 0}
          weeklyMinutes={summary?.totalMinutes ?? 0}
        />
      </div>

      <div className="flex flex-col max-w-7xl mx-auto lg:px-4">

        <div className="w-full">
          <QuickLinksSectionEnhanced />
        </div>

        <SectionDivider label="مؤشرات الأداء" />

        <div className="w-full space-y-12">
          <PerformanceDashboardSection />
          <AnalyticsSection />
        </div>

        <SectionDivider label="مساري التعليمي" />

        <div className="w-full space-y-12">
          <CoursesProgressSection />
          <ExamsSection />
          <AchievementsSection />
        </div>

        <SectionDivider label="موصى به لك" icon={Sparkles} />

        <div className="w-full">
          <RecommendedForYouSection />
        </div>

        <SectionDivider label="تحليلات وتوصيات" />

        <div className="flex flex-col gap-12 w-full">
          <IntelligentRecommendationsSection />
          <ProgressPredictionsSection />
          <TipsSection />
          <SocialFeaturesSection />
          <LiveActivityFeedSection />
        </div>

        <SectionDivider label="حالة النظام" />

        <div className="flex flex-col gap-12 w-full">
          <StatusIndicatorsSection />
          <FeaturesSection />
        </div>

      </div>

    </div>
  );
}
