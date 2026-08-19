'use client';

import { useGuestHomeData } from './hooks/useGuestHomeData';
import { HeroSection } from './sections/HeroSection';
import { WhyUsSection } from './sections/WhyUsSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { CoursesSection } from './sections/CoursesSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { InstructorsSection } from './sections/InstructorsSection';
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
  } = useGuestHomeData();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans" dir="rtl">
      <HeroSection
        categories={categories.slice(0, 5)}
        featuredCourse={courses[0]}
        stats={stats}
      />
      <WhyUsSection />
      <CategoriesSection categories={categories} loading={loadingCategories} />
      <CoursesSection
        courses={courses}
        loading={loadingCourses}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />
      <HowItWorksSection />
      <InstructorsSection instructors={instructors} loading={loadingInstructors} />
      <AchievementStrip stats={stats} />
      <BlogSection posts={blogPosts} loading={loadingBlog} />
      <InstructorCtaSection stats={stats} />
      <NewsletterSection />
    </div>
  );
}
