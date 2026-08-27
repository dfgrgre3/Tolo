'use client';

import React from 'react';
import { User } from '@/types/user';
import { ProgressSummary } from '@/types/gamification';
import { useGamification } from '@/hooks/use-gamification';

import { useDashboardResource } from './hooks/useDashboardResource';
import { AmbientBackground } from './shared/AmbientBackground';
import { HeroSection } from './sections/HeroSection';
import { DASH_CONTAINER } from './shared/design-system';
import {
  AnalyticsSection,
  CoursesProgressSection,
  ExamsSection,
  IntelligentRecommendationsSection,
  RecommendedForYouSection,
  SocialFeaturesSection,
  TipsSection,
  BrowseCategoriesSection,
  ExploreCoursesSection,
  TrendingTopicsDashboardSection,
  SpecializationProgramsSection,
  LearningPathsDashboardSection,
} from './sections/registry';
import { LazySection } from '@/components/layout/LazySection';

/** Panel-shaped placeholder that matches the Noon section rhythm. */
function PanelSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-xl border border-border bg-card animate-pulse"
      style={{ height }}
      aria-hidden="true"
    />
  );
}

interface UserHomeProps {
  user: User;
}

export function UserHome({ user }: UserHomeProps) {
  const { userProgress } = useGamification({ userId: user.id });
  const progressSummaryUrl = `/api/progress/summary?userId=${encodeURIComponent(user.id)}`;
  const { data: summary } = useDashboardResource<ProgressSummary>(progressSummaryUrl, 'ملخص التقدم');

  return (
    <div className="min-h-screen font-sans selection:bg-primary/30 selection:text-primary-foreground" dir="rtl">
      <AmbientBackground />

      <div className={`${DASH_CONTAINER.page} py-4 sm:py-6 lg:py-8`}>
        {/* ── Above the fold: hero banner, always eager ──────────────────── */}
        <HeroSection
          user={user}
          progress={userProgress}
          summary={summary}
        />

        {/* ── Stacked Noon panels ───────────────────────────────────────── */}
        <div className={`${DASH_CONTAINER.stack} mt-4 sm:mt-5`}>

          {/* استكشف */}
          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={208} />}
          >
            <BrowseCategoriesSection />
          </LazySection>

          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={420} />}
          >
            <ExploreCoursesSection />
          </LazySection>

          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={240} />}
          >
            <TrendingTopicsDashboardSection />
          </LazySection>

          {/* التحليلات */}
          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={460} />}
          >
            <AnalyticsSection />
          </LazySection>

          {/* مساري التعليمي */}
          <LazySection
            className="w-full space-y-4 sm:space-y-5"
            rootMargin="400px"
            skeleton={
              <>
                <PanelSkeleton height={380} />
                <PanelSkeleton height={480} />
              </>
            }
          >
            <CoursesProgressSection />
            <ExamsSection />
          </LazySection>

          {/* مسارات متقدمة */}
          <LazySection
            className="w-full space-y-4 sm:space-y-5"
            rootMargin="400px"
            skeleton={
              <>
                <PanelSkeleton height={320} />
                <PanelSkeleton height={340} />
              </>
            }
          >
            <LearningPathsDashboardSection />
            <SpecializationProgramsSection />
          </LazySection>

          {/* موصى به لك */}
          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={380} />}
          >
            <RecommendedForYouSection />
          </LazySection>

          {/* نصائح ومجتمع */}
          <LazySection
            className="flex flex-col gap-4 sm:gap-5 w-full"
            rootMargin="400px"
            skeleton={
              <>
                <PanelSkeleton height={360} />
                <PanelSkeleton height={320} />
              </>
            }
          >
            <IntelligentRecommendationsSection />
            <TipsSection />
            <SocialFeaturesSection />
          </LazySection>

        </div>
      </div>
    </div>
  );
}
