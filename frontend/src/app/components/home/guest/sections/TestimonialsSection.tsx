'use client';

import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER } from '../design-system';
import { useRef } from 'react';

interface Testimonial {
  id: string;
  studentName: string;
  studentAvatar?: string;
  rating: number;
  courseName: string;
  text: string;
  date?: string;
}

const SAMPLE_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    studentName: 'أحمد محمد',
    rating: 5,
    courseName: 'React للمبتدئين',
    text: 'كورس ممتاز جداً! شرح واضح جداً والمحاضر يتقن شرح المواد. تعلمت React بسهولة وبسرعة.',
    date: '2024-08-15',
  },
  {
    id: '2',
    studentName: 'فاطمة علي',
    rating: 5,
    courseName: 'Python للبيانات',
    text: 'منصة ثنائي رائعة! الكورسات منظمة جداً والأمثلة عملية. استفدت كثيراً وحصلت على شهادة معتمدة.',
    date: '2024-08-10',
  },
  {
    id: '3',
    studentName: 'محمود حسن',
    rating: 4.5,
    courseName: 'JavaScript المتقدم',
    text: 'كورس شامل وعملي جداً. تطبيقات حقيقية تساعد على الفهم. الدعم من المدرب ممتاز.',
    date: '2024-08-05',
  },
  {
    id: '4',
    studentName: 'نور الدين',
    rating: 5,
    courseName: 'Web Design',
    text: 'غيّر الكورس طريقة تفكيري في التصميم. تعلمت design principles وtools متقدمة. أنصح به بشدة!',
    date: '2024-07-28',
  },
  {
    id: '5',
    studentName: 'هيفاء سارة',
    rating: 5,
    courseName: 'UI/UX Design',
    text: 'أفضل استثمار قررت أن أعمله. الكورس علمني أساسيات وتطبيقات عملية وحصلت على وظيفة بعده!',
    date: '2024-07-20',
  },
  {
    id: '6',
    studentName: 'علي خالد',
    rating: 4,
    courseName: 'Node.js والـBackend',
    text: 'محتوى عملي جداً وسريع. الشرح واضح والتطبيقات تساعد على التعلم بسرعة. شكراً للفريق!',
    date: '2024-07-15',
  },
];

/**
 * Testimonial Card Component
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initial = testimonial.studentName.charAt(0);

  return (
    <div className="flex-shrink-0 w-full sm:w-96 p-6 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] hover:shadow-md dark:hover:shadow-orange-500/20 transition-all duration-150">
      {/* Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(testimonial.rating)
                ? 'fill-[#F59E0B] text-[#F59E0B]'
                : 'text-[#E2E8F0] dark:text-slate-600'
            }`}
          />
        ))}
        <span className="text-sm font-bold text-[#F59E0B] dark:text-orange-400 mr-2">
          {testimonial.rating}
        </span>
      </div>

      {/* Testimonial Text */}
      <p className="text-sm text-[#1E293B] dark:text-slate-200 mb-4 leading-relaxed line-clamp-3">
        &quot;{testimonial.text}&quot;
      </p>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0] dark:border-slate-700 mb-4" />

      {/* Student Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-[#0F766E] to-emerald-500 dark:from-orange-500 dark:to-orange-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
          {testimonial.studentAvatar ? (
            <Image
              src={testimonial.studentAvatar}
              alt={testimonial.studentName}
              fill
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

/**
 * TestimonialsSection
 *
 * Displays real student testimonials and reviews
 */
export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#E2E8F0] dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className={SECTION_HEADER.container}>
          <div className={SECTION_HEADER.content}>
            <h2 className={TYPOGRAPHY.sectionHeading}>
              ⭐ آراء الطلاب
            </h2>
            <p className={TYPOGRAPHY.sectionSubheading}>
              اسمع من الطلاب الذين غيّروا حياتهم معنا
            </p>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          {/* Scroll Container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            {SAMPLE_TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F766E] dark:text-orange-500 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {[...Array(Math.ceil(SAMPLE_TESTIMONIALS.length / 3))].map((_, i) => (
                <button
                  key={i}
                  className="h-2 rounded-full bg-[#E2E8F0] dark:bg-slate-700 transition-all"
                  style={{
                    width: i === 0 ? '24px' : '8px',
                    backgroundColor: i === 0 ? '#0F766E' : undefined,
                  }}
                  aria-label={`Go to testimonial group ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F766E] dark:text-orange-500 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <p className="text-sm text-[#64748B] dark:text-slate-400 mb-4">
              انضم لآلاف الطلاب الراضين عن تجربتهم
            </p>
            <button className="px-6 py-3 bg-[#0F766E] dark:bg-orange-600 text-white font-bold rounded-[8px] hover:bg-[#115E59] dark:hover:bg-orange-700 transition-colors">
              ابدأ تعلمك الآن
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
