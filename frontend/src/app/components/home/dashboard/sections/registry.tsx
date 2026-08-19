"use client";

import dynamic from "next/dynamic";

/** Placeholder shown while a section's chunk is downloading. */
export const SectionLoadingFallback = () => (
  <div className="w-full h-48 bg-card/20 rounded-[2rem] border border-white/5" />
);

export const PerformanceDashboardSection = dynamic(
  () => import("./PerformanceDashboardSection").then((mod) => mod.PerformanceDashboardSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const ExamsSection = dynamic(
  () => import("./ExamsSection").then((mod) => mod.ExamsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const AchievementsSection = dynamic(
  () => import("./AchievementsSection").then((mod) => mod.AchievementsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const QuickLinksSectionEnhanced = dynamic(
  () => import("./QuickLinksSectionEnhanced").then((mod) => mod.QuickLinksSectionEnhanced),
  { loading: () => <SectionLoadingFallback /> }
);

export const AnalyticsSection = dynamic(
  () => import("./AnalyticsSection").then((mod) => mod.AnalyticsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const IntelligentRecommendationsSection = dynamic(
  () => import("./IntelligentRecommendationsSection").then((mod) => mod.IntelligentRecommendationsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const LiveActivityFeedSection = dynamic(
  () => import("./LiveActivityFeedSection").then((mod) => mod.LiveActivityFeedSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const ProgressPredictionsSection = dynamic(
  () => import("./ProgressPredictionsSection").then((mod) => mod.ProgressPredictionsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const TipsSection = dynamic(
  () => import("./TipsSection").then((mod) => mod.TipsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const SocialFeaturesSection = dynamic(
  () => import("./SocialFeaturesSection").then((mod) => mod.SocialFeaturesSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const RecommendedForYouSection = dynamic(
  () => import("./RecommendedForYouSection").then((mod) => mod.RecommendedForYouSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const StatusIndicatorsSection = dynamic(
  () => import("./StatusIndicatorsSection").then((mod) => mod.StatusIndicatorsSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const FeaturesSection = dynamic(
  () => import("./FeaturesSection").then((mod) => mod.FeaturesSection),
  { loading: () => <SectionLoadingFallback /> }
);

export const CoursesProgressSection = dynamic(
  () => import("./CoursesProgressSection").then((mod) => mod.CoursesProgressSection),
  { loading: () => <SectionLoadingFallback /> }
);
