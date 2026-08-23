'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Star,
  Users,
  Clock,
  Play,
  Flame,
  Sparkles,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { StatsStrip } from './StatsStrip';
import type { Category, CourseItem, PlatformStats } from '../types';

interface HeroSectionProps {
  categories: Category[];
  featuredCourse?: CourseItem;
  stats: PlatformStats | null;
}

export function HeroSection({ categories, featuredCourse, stats }: HeroSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/courses?q=${encodeURIComponent(q)}`);
  };

  const heroTitle =
    featuredCourse?.nameAr || featuredCourse?.name || featuredCourse?.title || null;
  const heroThumb = featuredCourse?.thumbnailUrl || featuredCourse?.thumbnail;

  return (
    <section className="relative bg-gradient-to-br from-[#0F766E] via-[#0e7280] to-[#1e3a5f] overflow-hidden pt-10 pb-20">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#F59E0B]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-300/10 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-sm font-bold text-white/90">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              منصة ثنائي التعليمية
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              تعلّم المهارات الأكثر طلباً،
              <br />
              <span className="text-[#F59E0B]">واصنع مستقبلك اليوم</span>
            </h1>

            <p className="text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">
              منصة تعليمية عربية متكاملة تمنحك فرصة التعلم على يد الخبراء والمدربين،
              مع شهادات وتطبيقات عملية.
            </p>

            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="عن ماذا تريد أن تتعلم اليوم؟"
                  aria-label="ابحث عن كورس"
                  className="w-full pl-4 pr-11 py-4 bg-white rounded-xl text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] shadow-lg"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm rounded-xl shrink-0 shadow-lg shadow-[#F59E0B]/30"
              >
                ابحث الآن
              </button>
            </form>

            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white/60">تصفح المجالات:</span>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/courses?categoryId=${cat.id}`}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white rounded-full"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            {stats && stats.students > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Users className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-sm text-white/80 font-medium">
                  {stats.students.toLocaleString('ar-EG')} طالب مسجّل على المنصة
                </span>
              </div>
            )}
          </div>

          {featuredCourse && (
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -top-4 -right-4 z-20 px-4 py-2 bg-[#F59E0B] text-white text-xs font-black rounded-xl shadow-lg shadow-[#F59E0B]/30 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> كورس مميز
                </div>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                  <Link href={featuredCourse.slug ? `/courses/${featuredCourse.slug}` : '#'} className="block relative aspect-video bg-slate-200" onClick={(e) => {
                    if (!featuredCourse.slug) e.preventDefault();
                  }}>
                    {heroThumb ? (
                      <Image
                        src={heroThumb}
                        alt={heroTitle || 'كورس مميز'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] to-[#1e3a5f]" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-white/90 shadow-xl flex items-center justify-center">
                        <Play className="h-6 w-6 text-[#0F766E] ml-1" />
                      </span>
                    </span>
                  </Link>

                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[#0F766E] bg-emerald-50 px-2 py-0.5 rounded-md">
                        كورس مميز
                      </span>
                      <h2 className="text-base font-bold text-[#1E293B] mt-2 line-clamp-2">
                        {heroTitle}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between">
                      {typeof featuredCourse.rating === 'number' ? (
                        <div className="flex items-center gap-1 text-[#F59E0B]">
                          <Star className="h-4 w-4 fill-[#F59E0B]" />
                          <span className="font-bold text-sm text-[#1E293B]">
                            {featuredCourse.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            ({featuredCourse.reviewsCount ?? 0} تقييم)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748B]">لا يوجد تقييم بعد</span>
                      )}
                      <span className="font-black text-lg text-[#0F766E]">
                        {featuredCourse.price ? `${featuredCourse.price} ج.م` : 'مجاناً'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        {
                          icon: Users,
                          label: `${(
                            featuredCourse.enrolledCount ??
                            featuredCourse.studentsCount ??
                            0
                          ).toLocaleString('ar-EG')} طالب`,
                        },
                        ...(featuredCourse.durationHours
                          ? [{ icon: Clock, label: `${featuredCourse.durationHours} ساعة` }]
                          : []),
                        { icon: CheckCircle2, label: 'شهادة إتمام' },
                        { icon: Globe, label: 'عربي' },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Icon className="h-3.5 w-3.5 text-[#0F766E]" />
                          {label}
                        </div>
                      ))}
                    </div>

                    <Link
                      href={featuredCourse.slug ? `/courses/${featuredCourse.slug}` : '#'}
                      onClick={(e) => {
                        if (!featuredCourse.slug) e.preventDefault();
                      }}
                      className="w-full py-3 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-sm rounded-xl text-center flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      ابدأ التعلم الآن
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <StatsStrip stats={stats} />
      </div>
    </section>
  );
}
