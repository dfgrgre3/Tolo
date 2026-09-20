'use client';

import { useGuestHomeData } from './hooks/useGuestHomeData';
import './homepage-flat.css';
import { HeroSection } from './sections/HeroSection';
import { WhyUsSection } from './sections/WhyUsSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { FeaturedCoursesSection } from './sections/FeaturedCoursesSection';
import { CoursesSection } from './sections/CoursesSection';
import { NewCoursesSection } from './sections/NewCoursesSection';
import { BestTeachersSection } from './sections/BestTeachersSection';
import { ExamPreparationSection } from './sections/ExamPreparationSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { InstructorsSection } from './sections/InstructorsSection';
import { PromotionalCTASection } from './sections/PromotionalCTASection';
import { PlatformStatsSection } from './sections/PlatformStatsSection';
import { LearningPathsSection } from './sections/LearningPathsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { TrendingTopicsSection } from './sections/TrendingTopicsSection';
import { FreeResourcesSection } from './sections/FreeResourcesSection';
import { SpecializationTracksSection } from './sections/SpecializationTracksSection';
import { PartnersSection } from './sections/PartnersSection';
import { FAQSection } from './sections/FAQSection';
import { AchievementStrip } from './sections/StatsStrip';
import { BlogSection } from './sections/BlogSection';
import { InstructorCtaSection } from './sections/InstructorCtaSection';
import { NewsletterSection } from './sections/NewsletterSection';

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
