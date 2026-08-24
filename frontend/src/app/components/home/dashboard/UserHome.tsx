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
import { LazySection } from '@/components/layout/LazySection';

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

      {/* ── Above the fold: always eager ─────────────────────────────── */}
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

        {/* ── Performance metrics — second viewport, lazy ───────────── */}
        <SectionDivider label="مؤشرات الأداء" />

        <LazySection
          className="w-full space-y-12"
          rootMargin="400px"
          skeleton={<div className="w-full h-[520px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse" aria-hidden="true" />}
        >
          <PerformanceDashboardSection />
          <AnalyticsSection />
        </LazySection>

        {/* ── Course path — third viewport, lazy ───────────────────── */}
        <SectionDivider label="مساري التعليمي" />

        <LazySection
          className="w-full space-y-12"
          rootMargin="400px"
          skeleton={<div className="w-full h-[480px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse" aria-hidden="true" />}
        >
          <CoursesProgressSection />
          <ExamsSection />
          <AchievementsSection />
        </LazySection>

        {/* ── Recommendations — further down, lazy ─────────────────── */}
        <SectionDivider label="موصى به لك" icon={Sparkles} />

        <LazySection
          className="w-full"
          rootMargin="400px"
          skeleton={<div className="w-full h-[320px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse" aria-hidden="true" />}
        >
          <RecommendedForYouSection />
        </LazySection>

        {/* ── Analytics / tips — deeper page, lazy ─────────────────── */}
        <SectionDivider label="تحليلات وتوصيات" />

        <LazySection
          className="flex flex-col gap-12 w-full"
          rootMargin="400px"
          skeleton={<div className="w-full h-[600px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse" aria-hidden="true" />}
        >
          <IntelligentRecommendationsSection />
          <ProgressPredictionsSection />
          <TipsSection />
          <SocialFeaturesSection />
          <LiveActivityFeedSection />
        </LazySection>

        {/* ── System status — bottom of page, lazy ─────────────────── */}
        <SectionDivider label="حالة النظام" />

        <LazySection
          className="flex flex-col gap-12 w-full"
          rootMargin="300px"
          skeleton={<div className="w-full h-[280px] rounded-[2rem] bg-card/20 border border-white/5 animate-pulse" aria-hidden="true" />}
        >
          <StatusIndicatorsSection />
          <FeaturesSection />
        </LazySection>

      </div>

    </div>
  );
}
