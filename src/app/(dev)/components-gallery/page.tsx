'use client';

import React from 'react';
import { PerformanceDashboardSection } from '@/app/components/home/sections/PerformanceDashboardSection';
import { QuickLinksSectionEnhanced } from '@/app/components/home/sections/QuickLinksSectionEnhanced';
import { StatusIndicatorsSection } from '@/app/components/home/sections/StatusIndicatorsSection';
import { AnalyticsSection } from '@/app/components/home/sections/AnalyticsSection';
import { IntelligentRecommendationsSection } from '@/app/components/home/sections/IntelligentRecommendationsSection';
import { LiveActivityFeedSection } from '@/app/components/home/sections/LiveActivityFeedSection';
import { ProgressPredictionsSection } from '@/app/components/home/sections/ProgressPredictionsSection';
import { ExamsSection } from '@/app/components/home/sections/ExamsSection';
import { TipsSection } from '@/app/components/home/sections/TipsSection';
import { AchievementsSection } from '@/app/components/home/sections/AchievementsSection';

export default function ComponentsGalleryPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">معرض المكونات (Components Gallery)</h1>
        <p className="text-muted-foreground">عرض جميع المكونات بتصميمها الطبيعي</p>
      </div>

      <SectionWrapper title="Status Indicators">
        <StatusIndicatorsSection />
      </SectionWrapper>

      <SectionWrapper title="Quick Links">
        <QuickLinksSectionEnhanced />
      </SectionWrapper>

      <SectionWrapper title="Performance Dashboard">
        <PerformanceDashboardSection />
      </SectionWrapper>

      <SectionWrapper title="Analytics">
        <AnalyticsSection />
      </SectionWrapper>

      <SectionWrapper title="Exams">
        <ExamsSection />
      </SectionWrapper>

      <SectionWrapper title="Achievements">
        <AchievementsSection />
      </SectionWrapper>

      <SectionWrapper title="Intelligent Recommendations">
        <IntelligentRecommendationsSection />
      </SectionWrapper>

      <SectionWrapper title="Progress Predictions">
        <ProgressPredictionsSection />
      </SectionWrapper>

      <SectionWrapper title="Live Activity Feed">
        <LiveActivityFeedSection />
      </SectionWrapper>

      <SectionWrapper title="Tips">
        <TipsSection />
      </SectionWrapper>
    </div>
  );
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-6 bg-card shadow-sm">
      <h2 className="text-xl font-semibold mb-6 border-b pb-2">{title}</h2>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
