'use client';

import { useGuestHomeData } from './hooks/useGuestHomeData';
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
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#1E293B] dark:text-white font-sans" dir="rtl">
      {/* Hero Section */}
      <HeroSection
        categories={categories.slice(0, 5)}
        featuredCourse={courses[0]}
        stats={stats}
        loading={loadingData}
      />

      {/* Why Choose Us */}
      <WhyUsSection />

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

      {/* Best Teachers Showcase */}
      <BestTeachersSection instructors={topInstructors} loading={loadingInstructors} />

      {/* Free Learning Resources */}
      <FreeResourcesSection courses={courses} loading={loadingCourses} />

      {/* Trending Topics Right Now */}
      <TrendingTopicsSection />

      {/* Learning Paths */}
      <LearningPathsSection />

      {/* Specialization Programs */}
      <SpecializationTracksSection />

      {/* Exam Preparation Tracks */}
      <ExamPreparationSection />

      {/* Educational How-It-Works */}
      <HowItWorksSection />

      {/* Student Testimonials */}
      <TestimonialsSection />

      {/* Promotional CTA Section */}
      <PromotionalCTASection />

      {/* Technology Partners */}
      <PartnersSection />

      {/* Platform Statistics */}
      <PlatformStatsSection stats={stats} />

      {/* Achievement Stats Strip */}
      <AchievementStrip stats={stats} />

      {/* Instructor Spotlight */}
      <InstructorsSection instructors={instructors} loading={loadingInstructors} />

      {/* Blog Section */}
      <BlogSection posts={blogPosts} loading={loadingBlog} />

      {/* Frequently Asked Questions */}
      <FAQSection />

      {/* Become An Instructor CTA */}
      <InstructorCtaSection stats={stats} />

      {/* Newsletter Subscription */}
      <NewsletterSection />
    </div>
  );
}
