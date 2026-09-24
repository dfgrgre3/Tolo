'use client';

import dynamic from 'next/dynamic';
import { useGuestHomeData } from './hooks/useGuestHomeData';
import { AchievementStrip } from './sections/StatsStrip';
import './homepage-flat.css';
import { HeroSection } from './sections/HeroSection';
import { WhyUsSection } from './sections/WhyUsSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { FeaturedCoursesSection } from './sections/FeaturedCoursesSection';
import { CoursesSection } from './sections/CoursesSection';
import { NewCoursesSection } from './sections/NewCoursesSection';

// ── Below-the-fold: split into separate chunks so the cold-open bundle only
// contains hero + catalog. Each renders nothing until scrolled near (the
// section components are static content; a blank div reserves no layout
// because they sit far below the fold).
const BestTeachersSection = dynamic(
  () => import('./sections/BestTeachersSection').then((m) => ({ default: m.BestTeachersSection })),
  { ssr: false, loading: () => null },
);
const ExamPreparationSection = dynamic(
  () => import('./sections/ExamPreparationSection').then((m) => ({ default: m.ExamPreparationSection })),
  { ssr: false, loading: () => null },
);
const HowItWorksSection = dynamic(
  () => import('./sections/HowItWorksSection').then((m) => ({ default: m.HowItWorksSection })),
  { ssr: false, loading: () => null },
);
const InstructorsSection = dynamic(
  () => import('./sections/InstructorsSection').then((m) => ({ default: m.InstructorsSection })),
  { ssr: false, loading: () => null },
);
const PromotionalCTASection = dynamic(
  () => import('./sections/PromotionalCTASection').then((m) => ({ default: m.PromotionalCTASection })),
  { ssr: false, loading: () => null },
);
const PlatformStatsSection = dynamic(
  () => import('./sections/PlatformStatsSection').then((m) => ({ default: m.PlatformStatsSection })),
  { ssr: false, loading: () => null },
);
const LearningPathsSection = dynamic(
  () => import('./sections/LearningPathsSection').then((m) => ({ default: m.LearningPathsSection })),
  { ssr: false, loading: () => null },
);
const TestimonialsSection = dynamic(
  () => import('./sections/TestimonialsSection').then((m) => ({ default: m.TestimonialsSection })),
  { ssr: false, loading: () => null },
);
const TrendingTopicsSection = dynamic(
  () => import('./sections/TrendingTopicsSection').then((m) => ({ default: m.TrendingTopicsSection })),
  { ssr: false, loading: () => null },
);
const FreeResourcesSection = dynamic(
  () => import('./sections/FreeResourcesSection').then((m) => ({ default: m.FreeResourcesSection })),
  { ssr: false, loading: () => null },
);
const SpecializationTracksSection = dynamic(
  () => import('./sections/SpecializationTracksSection').then((m) => ({ default: m.SpecializationTracksSection })),
  { ssr: false, loading: () => null },
);
const PartnersSection = dynamic(
  () => import('./sections/PartnersSection').then((m) => ({ default: m.PartnersSection })),
  { ssr: false, loading: () => null },
);
const FAQSection = dynamic(
  () => import('./sections/FAQSection').then((m) => ({ default: m.FAQSection })),
  { ssr: false, loading: () => null },
);
const BlogSection = dynamic(
  () => import('./sections/BlogSection').then((m) => ({ default: m.BlogSection })),
  { ssr: false, loading: () => null },
);
const InstructorCtaSection = dynamic(
  () => import('./sections/InstructorCtaSection').then((m) => ({ default: m.InstructorCtaSection })),
  { ssr: false, loading: () => null },
);
const NewsletterSection = dynamic(
  () => import('./sections/NewsletterSection').then((m) => ({ default: m.NewsletterSection })),
  { ssr: false, loading: () => null },
);

export default function GuestHome() {
  const {
    categories,
    courses,
    instructors,
    blogPosts,
    stats,
    selectedTab,
    setSelectedTab,
    loadingCategories,
    loadingInstructors,
    loadingBlog,
    loadingCourses,
    loadingData,
  } = useGuestHomeData();

  // Split courses into featured and new
  const featuredCourses = courses.slice(0, 4);
  const newCourses = courses.slice(4, 8);
  const topInstructors = instructors.slice(0, 6);

  return (
    <div className="homepage-flat motion-off min-h-screen bg-white dark:bg-slate-950 text-[#1E293B] dark:text-white font-sans" dir="rtl">
      {/* Hero Section */}
      <HeroSection
        categories={categories.slice(0, 5)}
        featuredCourse={courses[0]}
        stats={stats}
        loading={loadingData}
      />

      {/* ── Discover: quick navigation into the catalog ── */}
      {/* Quick Categories Navigation */}
      <CategoriesSection categories={categories} loading={loadingCategories} />

      {/* Featured Premium Courses */}
      <FeaturedCoursesSection courses={featuredCourses} loading={loadingCourses} />

      {/* Main Courses with Filtering */}
      <CoursesSection
        courses={courses}
        loading={loadingCourses}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {/* Latest Courses Addition */}
      <NewCoursesSection courses={newCourses} loading={loadingCourses} />

      {/* ── Guided tracks: paths, specializations, exam prep ── */}
      {/* Learning Paths */}
      <LearningPathsSection />

      {/* Specialization Programs */}
      <SpecializationTracksSection />

      {/* Exam Preparation Tracks */}
      <ExamPreparationSection />

      {/* Educational How-It-Works */}
      <HowItWorksSection />

      {/* Why Choose Us */}
      <WhyUsSection />

      {/* ── People: teachers, then free value ── */}
      {/* Best Teachers Showcase */}
      <BestTeachersSection instructors={topInstructors} loading={loadingInstructors} />

      {/* Instructor Spotlight */}
      <InstructorsSection instructors={instructors} loading={loadingInstructors} />

      {/* Free Learning Resources */}
      <FreeResourcesSection courses={courses} loading={loadingCourses} />

      {/* Trending Topics Right Now */}
      <TrendingTopicsSection />

      {/* ── Proof: testimonials, partners, platform numbers ── */}
      {/* Student Testimonials */}
      <TestimonialsSection />

      {/* Technology Partners */}
      <PartnersSection />

      {/* Platform Statistics */}
      <PlatformStatsSection stats={stats} />

      {/* Achievement Stats Strip */}
      <AchievementStrip stats={stats} />

      {/* ── Learn more, then convert ── */}
      {/* Blog Section */}
      <BlogSection posts={blogPosts} loading={loadingBlog} />

      {/* Frequently Asked Questions */}
      <FAQSection />

      {/* Promotional CTA Section */}
      <PromotionalCTASection />

      {/* Become An Instructor CTA */}
      <InstructorCtaSection stats={stats} />

      {/* Newsletter Subscription */}
      <NewsletterSection />
    </div>
  );
}
