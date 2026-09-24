'use client';

import React from 'react';
import { User } from '@/types/user';
import { ProgressSummary } from '@/types/gamification';
import { useGamification } from '@/features/gamification';

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
  const { userProgress } = useGamification();
  // Session-scoped: the backend resolves the user from the JWT, so no
  // ?userId= is appended (IDOR/BOLA hardening).
  const { data: summary } = useDashboardResource<ProgressSummary>('/api/progress/summary', 'Ù…Ù„Ø®Øµ Ø§Ù„ØªÙ‚Ø¯Ù…');

  return (
    <div className="motion-off min-h-screen font-sans selection:bg-primary/30 selection:text-primary-foreground" dir="rtl">
      <AmbientBackground />

      <div className={`${DASH_CONTAINER.page} py-4 sm:py-6 lg:py-8`}>
        {/* Above the fold: hero banner, always eager */}
        <HeroSection
          user={user}
          progress={userProgress}
          summary={summary}
        />

        {/* Stacked panels: continue first, then discover */}
        <div className={`${DASH_CONTAINER.stack} mt-6 sm:mt-8`}>

          {/* Continue where you left off */}
          <LazySection
            className="w-full space-y-6 sm:space-y-8"
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

          {/* Recommended for you */}
          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={380} />}
          >
            <RecommendedForYouSection />
          </LazySection>

          {/* Discover */}
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
            skeleton={<PanelSkeleton height={208} />}
          >
            <BrowseCategoriesSection />
          </LazySection>

          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={240} />}
          >
            <TrendingTopicsDashboardSection />
          </LazySection>

          {/* Advanced paths */}
          <LazySection
            className="w-full space-y-6 sm:space-y-8"
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

          {/* Analytics */}
          <LazySection
            className="w-full"
            rootMargin="400px"
            skeleton={<PanelSkeleton height={460} />}
          >
            <AnalyticsSection />
          </LazySection>

          {/* Community */}
          <LazySection
            className="flex flex-col gap-6 sm:gap-8 w-full"
            rootMargin="400px"
            skeleton={
              <>
                <PanelSkeleton height={360} />
                <PanelSkeleton height={320} />
              </>
            }
          >
            <IntelligentRecommendationsSection />
            <SocialFeaturesSection />
          </LazySection>

        </div>
      </div>
    </div>
  );
}
