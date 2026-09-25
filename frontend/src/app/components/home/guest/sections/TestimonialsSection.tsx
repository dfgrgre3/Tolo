'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION, RAIL } from '../design-system';
import { fetchPublicCoursesRaw } from '@/features/courses/api/courses-gateway';
import { apiClient } from '@/lib/api/api-client';

interface ReviewUser {
  id: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  name?: string;
  avatar?: string;
  profileImage?: string;
  profile_image?: string;
}

interface ReviewFromAPI {
  id: string;
  rating: number;
  comment?: string;
  content?: string;
  text?: string;
  createdAt?: string;
  user?: ReviewUser;
  User?: ReviewUser;
}

interface Testimonial {
  id: string;
  studentName: string;
  studentAvatar?: string;
  rating: number;
  courseName: string;
  text: string;
}

/**
 * Testimonial Card Component
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initial = testimonial.studentName.charAt(0);

  return (
    <div className={`${RAIL.item} w-80 p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] hover:shadow-md dark:hover:shadow-orange-500/20 transition-all duration-150`}>
      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < Math.floor(testimonial.rating)
                ? 'fill-[#F59E0B] text-[#F59E0B]'
                : 'text-[#E2E8F0] dark:text-slate-600'
            }`}
          />
        ))}
        <span className="text-xs font-bold text-[#F59E0B] dark:text-orange-400 mr-2">
          {testimonial.rating}
        </span>
      </div>

      {/* Testimonial Text */}
      <p className="text-sm text-[#1E293B] dark:text-slate-200 mb-3 leading-relaxed line-clamp-3">
        &quot;{testimonial.text}&quot;
      </p>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-3" />

      {/* Student Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-[#0F766E] to-emerald-500 dark:from-orange-500 dark:to-orange-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
          {testimonial.studentAvatar ? (
            <Image
              src={testimonial.studentAvatar}
              alt={testimonial.studentName}
              fill sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          ) : (
            initial
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1E293B] dark:text-white truncate">
            {testimonial.studentName}
          </p>
          <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
            {testimonial.courseName}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for loading state */
function TestimonialSkeleton() {
  return (
    <div className={`${RAIL.item} w-80 p-4 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] animate-pulse`}>
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3.5 w-3.5 rounded bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-3/5 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
      <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-3" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * TestimonialsSection
 *
 * Fetches real course reviews from the backend and displays them.
 * Falls back to hiding the section when no reviews exist.
 */
export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      try {
        // 1. Fetch popular courses to get their IDs
        const coursesData = await fetchPublicCoursesRaw<{ items?: Array<{ id: string; name?: string; nameAr?: string; title?: string; slug: string }> }>(
          '?isPublished=true&isActive=true&limit=5&sort=enrolledCount&order=desc'
        );
        const courses = coursesData.items || [];
        if (cancelled || courses.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch reviews for top courses in parallel
        const reviewPromises = courses.slice(0, 3).map(async (course) => {
          try {
            const reviews = await apiClient.get<ReviewFromAPI[]>(
              `/courses/${course.id}/reviews?limit=3`
            );
            return (Array.isArray(reviews) ? reviews : []).map((r) => ({
              review: r,
              courseName: course.nameAr || course.name || course.title || 'كورس',
            }));
          } catch {
            return [];
          }
        });

        const allResults = await Promise.all(reviewPromises);
        if (cancelled) return;

        const mapped: Testimonial[] = allResults
          .flat()
          .filter((item) => {
            const text = item.review.comment || item.review.content || item.review.text;
            return text && text.length >= 10 && item.review.rating >= 3;
          })
          .map((item) => {
            const r = item.review;
            const user = r.user || r.User;
            const name = user
              ? (user.name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim()) || 'طالب'
              : 'طالب';
            const avatar = user?.avatar || user?.profileImage || user?.profile_image;

            return {
              id: r.id,
              studentName: name,
              studentAvatar: avatar,
              rating: r.rating,
              courseName: item.courseName,
              text: (r.comment || r.content || r.text) as string,
            };
          })
          .slice(0, 6);

        setTestimonials(mapped);
      } catch {
        // Silently fail — section hides when empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReviews();
    return () => { cancelled = true; };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Hide section entirely when no real reviews are available
  if (!loading && testimonials.length === 0) {
    return null;
  }

  return (
    <section className={`${SECTION.padding} bg-gradient-to-b from-white to-[#F8FAFC] dark:from-slate-900 dark:to-slate-950`}>
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              ⭐ آراء الطلاب
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              تقييمات حقيقية من طلاب المنصة
            </p>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          {/* Scroll Container */}
          <div
            ref={scrollRef}
            className={RAIL.container}
            style={{ scrollBehavior: 'smooth' }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <TestimonialSkeleton key={i} />)
              : testimonials.map((testimonial) => (
                  <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                ))}
          </div>

          {/* Navigation Buttons */}
          {!loading && testimonials.length > 2 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F766E] dark:text-orange-500 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
                aria-label="التقييم السابق"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F766E] dark:text-orange-500 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
                aria-label="التقييم التالي"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
