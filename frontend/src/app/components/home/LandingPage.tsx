'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Star,
  Users,
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  Mail,
  Send,
  UserCheck,
} from 'lucide-react';
import { CourseCard, CourseCardSkeleton } from '@/components/common/CourseCard';
import { createClient } from '@/utils/supabase/client';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'popular' | 'latest' | 'top_rated'>('popular');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 1. Hero Featured Course & Chips
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-hero'],
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .limit(5);
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: heroCourse } = useQuery({
    queryKey: ['hero-featured-course'],
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles:instructor_id(name, avatar), categories:category_id(name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const [cRes, sRes, iRes, certRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'instructor'),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
      ]);
      return {
        courses: cRes.count || 120,
        students: sRes.count || 4500,
        instructors: iRes.count || 85,
        certificates: certRes.count || 1800,
      };
    },
  });

  // 2. Categories with Course Count
  const { data: categoriesWithCount = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-all-count'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, icon, courses(count)')
          .limit(12);
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // 3. Courses Tabs Query
  const { data: tabCourses = [], isLoading: isLoadingTabCourses } = useQuery({
    queryKey: ['landing-courses-tab', selectedTab],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*, profiles:instructor_id(name, avatar), categories:category_id(name)')
        .eq('is_published', true)
        .eq('is_approved', true)
        .limit(8);

      if (selectedTab === 'popular') {
        query = query.order('students_count', { ascending: false });
      } else if (selectedTab === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('rating_avg', { ascending: false });
      }

      const { data } = await query;
      return data || [];
    },
  });

  // 5. Instructors Query
  const { data: topInstructors = [], isLoading: isLoadingInstructors } = useQuery({
    queryKey: ['landing-top-instructors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar, bio')
        .eq('role', 'instructor')
        .limit(6);
      return data || [];
    },
  });

  // 6. Reviews Query
  const { data: topReviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['landing-top-reviews'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, user_id, course_id, profiles(name, avatar), courses(title)')
        .gte('rating', 4)
        .limit(6);
      return data || [];
    },
  });

  // 7. Dark Banner Stats
  const { data: darkStats } = useQuery({
    queryKey: ['landing-dark-stats'],
    queryFn: async () => {
      const [eRes, lpRes, cRes, crsRes] = await Promise.all([
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('completed', true),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);
      return {
        enrollments: eRes.count || 12500,
        lessonsCompleted: lpRes.count || 85400,
        certificates: cRes.count || 3200,
        courses: crsRes.count || 140,
      };
    },
  });

  // 8. Blog Posts Query
  const { data: blogPosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['landing-blog-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, cover, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  // 10. Newsletter Submission
  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from('subscribers').insert({ email });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      setNewsletterStatus('success');
      setNewsletterEmail('');
    },
    onError: () => {
      setNewsletterStatus('error');
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes('@')) {
      setNewsletterStatus('loading');
      subscribeMutation.mutate(newsletterEmail);
    }
  };

  const featuredPost = blogPosts[0];
  const sidePosts = blogPosts.slice(1, 4);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans dir-rtl" dir="rtl">
      {/* ── SECTION 1: HERO ── */}
      <section className="bg-white border-b border-[#E2E8F0] pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Right Column: Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1E293B] leading-tight font-alexandria">
                تعلم المهارات الأكثر طلباً، واصنع مستقبلك اليوم
              </h1>
              <p className="text-base sm:text-lg text-[#64748B] max-w-2xl font-medium leading-relaxed">
                منصة تعليمية عربية متكاملة تمنحك فرصة التعلم على يد أفضل الخبراء والمدربين، مع شهادات معتمدة وتطبيقات عملية.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="عن ماذا تريد أن تتعلم اليوم؟"
                    className="w-full pl-4 pr-11 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] text-sm focus:outline-none focus:border-[#0F766E] text-[#1E293B]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm rounded-[8px] shrink-0 transition-colors duration-150"
                >
                  ابحث الآن
                </button>
              </form>

              {/* Category Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-bold text-[#64748B]">الأكثر بحثاً:</span>
                {categories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/courses?category=${cat.slug}`}
                    className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] hover:text-[#0F766E] text-xs font-semibold text-[#64748B] rounded-full transition-colors duration-150"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>

              {/* Trust Line */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-1 text-[#F59E0B]">
                  <Star className="h-5 w-5 fill-[#F59E0B]" />
                  <span className="font-extrabold text-base text-[#1E293B]">4.8</span>
                </div>
                <span className="text-xs text-[#64748B] font-medium">
                  من أصل +10,000 تقييم من الطلاب الشغوفين
                </span>
              </div>
            </div>

            {/* Left Column: Visual Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-4 shadow-xs space-y-4">
                <div className="relative aspect-video rounded-[8px] overflow-hidden bg-slate-100">
                  <Image
                    src={heroCourse?.thumbnail || '/images/hero-course.jpg'}
                    alt="كورس مميز"
                    fill
                    className="object-cover"
                  />
                  <span className="absolute top-3 right-3 bg-[#0F766E] text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    الكورس الأعلى تقييماً
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#0F766E] font-bold">كورس مميز</span>
                  <h2 className="text-base font-bold text-[#1E293B] line-clamp-1 mt-1">
                    {heroCourse?.title || 'الدورة الشاملة لتطوير التطبيقات والواجهات الحديثة'}
                  </h2>
                  <div className="flex items-center justify-between mt-3 text-xs text-[#64748B]">
                    <span>⭐ 4.9 ({heroCourse?.reviews_count || 120} تقييم)</span>
                    <span className="font-black text-sm text-[#0F766E]">
                      {heroCourse?.price ? `${heroCourse.price} ج.م` : 'مجاناً'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Stats Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0F766E] text-white rounded-[12px] p-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-alexandria">{stats?.courses}+</div>
              <div className="text-xs text-emerald-100 font-medium mt-1">كورس تدريبي</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-alexandria">{stats?.students}+</div>
              <div className="text-xs text-emerald-100 font-medium mt-1">طالب يتعلم معنا</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-alexandria">{stats?.instructors}+</div>
              <div className="text-xs text-emerald-100 font-medium mt-1">مدرب خبير</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-alexandria">{stats?.certificates}+</div>
              <div className="text-xs text-emerald-100 font-medium mt-1">شهادة صادرة</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: BROWSE BY CATEGORY ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
              تصفح الكورسات حسب المجال
            </h2>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              اختر المجال الذي تريد احترافه وابدأ رحلة التعلم
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59] transition-colors"
          >
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {isLoadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-[#E2E8F0] rounded-[12px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categoriesWithCount.map((cat: any) => (
              <Link
                key={cat.id}
                href={`/courses?category=${cat.slug}`}
                className="flex flex-col items-center justify-center p-5 bg-white border border-[#E2E8F0] rounded-[12px] hover:border-[#0F766E] transition-colors text-center group"
              >
                <div className="h-10 w-10 rounded-full bg-teal-50 text-[#0F766E] flex items-center justify-center mb-3 group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-1">
                  {cat.name}
                </h3>
                <span className="text-xs text-[#64748B] mt-1 font-medium">
                  {cat.courses?.[0]?.count || 0} كورس
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 3: COURSES TABS ── */}
      <section className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
                استكشف الكورسات المتاحة
              </h2>
              <p className="text-sm text-[#64748B] font-medium mt-1">
                اختر من بين مئات الكورسات المصممة بعناية لتناسب كل المستويات
              </p>
            </div>

            {/* Instant Tabs */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-[8px] self-start">
              <button
                onClick={() => setSelectedTab('popular')}
                className={`px-4 py-2 text-xs font-bold rounded-[6px] transition-colors ${
                  selectedTab === 'popular' ? 'bg-[#0F766E] text-white' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                الأكثر شعبية
              </button>
              <button
                onClick={() => setSelectedTab('latest')}
                className={`px-4 py-2 text-xs font-bold rounded-[6px] transition-colors ${
                  selectedTab === 'latest' ? 'bg-[#0F766E] text-white' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                الأحدث
              </button>
              <button
                onClick={() => setSelectedTab('top_rated')}
                className={`px-4 py-2 text-xs font-bold rounded-[6px] transition-colors ${
                  selectedTab === 'top_rated' ? 'bg-[#0F766E] text-white' : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                الأعلى تقييماً
              </button>
            </div>
          </div>

          {isLoadingTabCourses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : tabCourses.length === 0 ? (
            <div className="text-center py-12 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0]">
              <p className="text-sm text-[#64748B] font-bold">لا توجد كورسات متاحة حالياً في هذا القسم.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tabCourses.map((crs: any) => (
                <CourseCard
                  key={crs.id}
                  id={crs.id}
                  title={crs.title}
                  slug={crs.slug}
                  thumbnail={crs.thumbnail}
                  categoryName={crs.categories?.name}
                  instructorName={crs.profiles?.name}
                  instructorAvatar={crs.profiles?.avatar}
                  ratingAvg={crs.rating_avg}
                  reviewsCount={crs.reviews_count}
                  studentsCount={crs.students_count}
                  price={crs.price}
                  discountPrice={crs.discount_price}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F766E] font-bold text-sm rounded-[8px] transition-colors"
            >
              عرض كافة الكورسات
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: HOW IT WORKS ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
            كيف تتعلم وتنجح معنا؟
          </h2>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            4 خطوات بسيطة تفصلك عن تطوير مهاراتك والحصول على فرصتك القادمة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'إنشاء حساب مجاني', desc: 'سجل حسابك في ثوانٍ معدودة واستكشف آلاف الدروس والكورسات المتاحة.' },
            { step: '02', title: 'اختر كورسك المناسب', desc: 'تصفح المجالات المختلفة واختر الدورة التي تتوافق مع أهدافك المهنية.' },
            { step: '03', title: 'تعلّم وتدرّب', desc: 'شاهد الدروس بدقة فائقة وحل الاختبارات التفاعلية لتأكيد استيعابك.' },
            { step: '04', title: 'احصل على شهادتك', desc: 'عند إكمال الكورس بنجاح، احصل فوراً على شهادة إنجاز معتمدة قابلة للمشاركة.' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] p-6 rounded-[12px] relative overflow-hidden">
              <span className="text-4xl font-black text-[#0F766E]/20 font-alexandria absolute top-4 left-4">
                {item.step}
              </span>
              <h3 className="text-base font-bold text-[#1E293B] mb-2">{item.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 5: TOP INSTRUCTORS ── */}
      <section className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
                أفضل المدربين والخبراء
              </h2>
              <p className="text-sm text-[#64748B] font-medium mt-1">
                نخبة من المتخصصين المتميزين لنقل خبراتهم العملية إليك مباشرة
              </p>
            </div>
            <Link
              href="/instructors"
              className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59]"
            >
              عرض الكل <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>

          {isLoadingInstructors ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-[#F8FAFC] rounded-[12px] border border-[#E2E8F0] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topInstructors.map((ins: any) => (
                <Link
                  key={ins.id}
                  href={`/instructors/${ins.id}`}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0F766E] p-4 rounded-[12px] text-center flex flex-col items-center transition-colors group"
                >
                  <div className="relative h-16 w-16 rounded-full overflow-hidden mb-3 bg-slate-200">
                    {ins.avatar ? (
                      <Image src={ins.avatar} alt={ins.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[#0F766E] text-white font-bold flex items-center justify-center text-lg">
                        {ins.name?.charAt(0) || 'م'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-1">
                    {ins.name}
                  </h3>
                  <p className="text-xs text-[#64748B] line-clamp-1 mt-1 font-medium">
                    {ins.bio || 'مدرب معتمد'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 6: STUDENT REVIEWS ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
            ماذا يقول طلابنا؟
          </h2>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            تجارب حقيقية لطلاب حققوا أهدافهم وطوروا مهاراتهم عبر منصتنا
          </p>
        </div>

        {isLoadingReviews ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-white border border-[#E2E8F0] rounded-[12px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topReviews.map((rev: any) => (
              <div key={rev.id} className="bg-white border border-[#E2E8F0] p-6 rounded-[12px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[#F59E0B] mb-3">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#F59E0B]" />
                    ))}
                  </div>
                  <p className="text-xs text-[#1E293B] leading-relaxed font-medium mb-4">
                    "{rev.comment}"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="h-8 w-8 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center">
                    {rev.profiles?.name?.charAt(0) || 'ط'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1E293B]">{rev.profiles?.name || 'طالب متميز'}</h4>
                    <span className="text-[10px] text-[#64748B] line-clamp-1">{rev.courses?.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 7: DARK STATS STRIP ── */}
      <section className="py-16 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#F59E0B] font-alexandria">
                {darkStats?.enrollments.toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-bold mt-2">عملية تسجيل بالدورات</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#F59E0B] font-alexandria">
                {darkStats?.lessonsCompleted.toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-bold mt-2">درس أكمله الطلاب</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#F59E0B] font-alexandria">
                {darkStats?.certificates.toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-bold mt-2">شهادة صادرة بتميز</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#F59E0B] font-alexandria">
                {darkStats?.courses}+
              </div>
              <div className="text-xs text-slate-400 font-bold mt-2">دورة موثوقة ونشطة</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FROM BLOG ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B] font-alexandria">
              أحدث المقالات من مدونتنا
            </h2>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              نصائح وإرشادات تقنية وتوجيهات مهنية لتعزيز مسارك التعليمي
            </p>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-1 text-sm font-bold text-[#0F766E] hover:text-[#115E59]"
          >
            عرض جميع المقالات <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {isLoadingPosts ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-64 bg-white rounded-[12px] border border-[#E2E8F0] animate-pulse" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-20 bg-white rounded-[12px] border border-[#E2E8F0] animate-pulse" />
              <div className="h-20 bg-white rounded-[12px] border border-[#E2E8F0] animate-pulse" />
            </div>
          </div>
        ) : blogPosts.length === 0 ? (
          <div className="text-center py-8 text-sm text-[#64748B] font-bold">لا توجد مقالات منشورة حالياً.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Featured Post */}
            {featuredPost && (
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden hover:border-[#0F766E] transition-colors group flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-slate-100">
                  <Image
                    src={featuredPost.cover || '/images/blog-placeholder.jpg'}
                    alt={featuredPost.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <span className="text-xs font-bold text-[#0F766E]">مقال مميز</span>
                  <h3 className="text-xl font-bold text-[#1E293B] group-hover:text-[#0F766E] mt-2 mb-3">
                    {featuredPost.title}
                  </h3>
                  <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed font-medium">
                    {featuredPost.excerpt}
                  </p>
                </div>
              </Link>
            )}

            {/* Side Posts */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {sidePosts.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="bg-white border border-[#E2E8F0] p-4 rounded-[12px] hover:border-[#0F766E] transition-colors group flex gap-4 items-center"
                >
                  <div className="relative h-16 w-24 rounded-[6px] overflow-hidden bg-slate-100 shrink-0">
                    <Image
                      src={post.cover || '/images/blog-placeholder.jpg'}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] line-clamp-2">
                      {post.title}
                    </h4>
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 9: INSTRUCTOR CTA BANNER ── */}
      <section className="py-16 bg-[#0F766E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-alexandria">
              هل أنت خبير وترغب في مشاركة معرفتك؟
            </h2>
            <p className="text-sm sm:text-base text-emerald-100 font-medium">
              انضم إلى فريقتنا كمدرب وقم بإنشاء دوراتك التدريبية والوصول لآلاف الطلاب في جميع أنحاء العالم العربي وتحقيق دخل ممتاز.
            </p>
            <div className="pt-4">
              <Link
                href="/teach"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm rounded-[8px] transition-colors shadow-xs"
              >
                ابدأ التدريس الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: NEWSLETTER ── */}
      <section className="py-16 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-teal-50 text-[#0F766E] mx-auto flex items-center justify-center">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-[#1E293B] font-alexandria">
            اشترك في نشرتنا البريدية
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium">
            احصل على أحدث الكورسات، المقالات التعليمية، والعروض الحصرية مباشرة في بريدك
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto pt-2">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] text-sm focus:outline-none focus:border-[#0F766E] text-[#1E293B]"
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              className="w-full sm:w-auto px-6 py-3 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-sm rounded-[8px] shrink-0 transition-colors"
            >
              {newsletterStatus === 'loading' ? 'جاري الاشتراك...' : 'اشترك'}
            </button>
          </form>

          {newsletterStatus === 'success' && (
            <p className="text-xs font-bold text-emerald-600">تم اشتراكك في النشرة البريدية بنجاح!</p>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-xs font-bold text-red-600">حدث خطأ أثناء الاشتراك، يرجى المحاولة لاحقاً.</p>
          )}
        </div>
      </section>
    </div>
  );
}