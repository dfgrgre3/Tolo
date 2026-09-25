"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  Clock,
  GraduationCap,
  MapPin,
  Star,
  Users,
  Award,
  MessageSquareText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CourseCardSkeleton } from "@/components/common/CourseCard";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/api/api-client";
import {
  getTeacherPublicCourses,
  getTeacherPublicReviews,
  type TeacherPublicProfile,
  type TeacherPublicCourse,
  type TeacherPublicReview,
  type TeacherReviewsSummary,
} from "@/lib/teacher/teacher-service";

const COURSES_PAGE_SIZE = 9;
const REVIEWS_PAGE_SIZE = 10;

interface Props {
  profile: TeacherPublicProfile;
  initialCourses: TeacherPublicCourse[];
  coursesTotal: number;
}

const SECTIONS = [
  { id: "about", label: "نظرة عامة" },
  { id: "courses", label: "الكورسات" },
  { id: "reviews", label: "التقييمات" },
] as const;

function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`التقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
        />
      ))}
    </span>
  );
}

function courseCta(course: TeacherPublicCourse) {
  const href = `/courses/${course.slug || course.id}`;
  switch (course.state) {
    case "ENROLLED":
      return { href, label: "متابعة الكورس", disabled: false, primary: true };
    case "FREE":
      return { href, label: "ابدأ مجانًا", disabled: false, primary: true };
    case "COMING_SOON":
      return { href, label: "قريبًا", disabled: true, primary: false };
    case "SOLD_OUT":
      return { href, label: "مكتمل العدد", disabled: true, primary: false };
    case "UNAVAILABLE":
      return { href, label: "غير متاح حاليًا", disabled: true, primary: false };
    default:
      return { href, label: "عرض الكورس", disabled: false, primary: false };
  }
}

export default function TeacherProfileClient({ profile, initialCourses, coursesTotal }: Props) {
  const [activeSection, setActiveSection] = useState<string>("about");

  const [courses, setCourses] = useState<TeacherPublicCourse[]>(initialCourses);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const coursesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(coursesTotal / COURSES_PAGE_SIZE)),
    [coursesTotal]
  );

  const [reviews, setReviews] = useState<TeacherPublicReview[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<TeacherReviewsSummary | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  const [bioExpanded, setBioExpanded] = useState(false);

  const featuredCourses = useMemo(() => courses.filter((c) => c.isFeatured).slice(0, 3), [courses]);

  const loadCourses = useCallback(
    async (page: number) => {
      setCoursesLoading(true);
      setCoursesError("");
      try {
        const res = await getTeacherPublicCourses(profile.id, { page, limit: COURSES_PAGE_SIZE });
        setCourses(res.items ?? []);
        setCoursesPage(page);
      } catch (err) {
        logger.error("Failed to load teacher courses", err);
        setCoursesError("تعذر تحميل الكورسات. حاول مرة أخرى.");
      } finally {
        setCoursesLoading(false);
      }
    },
    [profile.id]
  );

  const loadReviews = useCallback(
    async (page: number) => {
      setReviewsLoading(true);
      setReviewsError("");
      try {
        const res = await getTeacherPublicReviews(profile.id, { page, limit: REVIEWS_PAGE_SIZE });
        setReviews(res.items ?? []);
        setReviewsSummary(res.summary);
        setReviewsPage(page);
        setReviewsTotalPages(Math.max(1, res.pagination.totalPages));
      } catch (err) {
        if (!(err instanceof ApiError)) logger.error("Failed to load teacher reviews", err);
        setReviewsError("تعذر تحميل التقييمات. حاول مرة أخرى.");
      } finally {
        setReviewsLoading(false);
      }
    },
    [profile.id]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data on mount/param change; setState in async callback is intentional sync
    loadReviews(1);
  }, [loadReviews, profile.id]);

  useEffect(() => {
    const onScroll = () => {
      const pos = window.scrollY + 160;
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(`teacher-${s.id}`);
        if (el && el.offsetTop <= pos) current = s.id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stats = profile.stats;
  const statItems = [
    ...(stats.studentsCount > 0
      ? [{ icon: Users, label: "طالب", value: stats.studentsCount.toLocaleString("ar-EG") }]
      : []),
    ...(stats.coursesCount > 0
      ? [{ icon: BookOpen, label: "كورس", value: stats.coursesCount.toLocaleString("ar-EG") }]
      : []),
    ...(stats.lessonsCount > 0
      ? [{ icon: Clock, label: "درس", value: stats.lessonsCount.toLocaleString("ar-EG") }]
      : []),
    ...(stats.ratingAvg > 0
      ? [{ icon: Star, label: "التقييم", value: stats.ratingAvg.toFixed(1) }]
      : []),
  ];

  const bio = profile.bio?.trim() || "";
  const bioLong = bio.length > 280;
  const bioShown = bioLong && !bioExpanded ? `${bio.slice(0, 280)}…` : bio;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-[#0B0D14]" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="font-medium transition-colors hover:text-primary">
            الرئيسية
          </Link>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Link href="/teachers" className="font-medium transition-colors hover:text-primary">
            المدرسون
          </Link>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span aria-current="page" className="truncate font-bold text-gray-900 dark:text-white">
            {profile.name}
          </span>
        </nav>

        {/* Hero */}
        <section aria-labelledby="teacher-name" className="overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
          <div className="h-28 bg-gradient-to-l from-primary/20 via-primary/5 to-violet-500/10 sm:h-36" aria-hidden />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 rounded-3xl border-4 border-white shadow-lg dark:border-[#0B0D14] sm:h-28 sm:w-28">
                <AvatarImage src={profile.avatar || undefined} alt={`صورة ${profile.name}`} />
                <AvatarFallback className="rounded-3xl bg-gradient-to-tr from-primary to-violet-500 text-3xl font-black text-white">
                  {profile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="teacher-name" className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                    {profile.name}
                  </h1>
                  {profile.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      <BadgeCheck className="h-4 w-4" aria-hidden />
                      مدرس موثّق
                    </span>
                  )}
                </div>
                <p className="mt-1 font-medium text-gray-500 dark:text-gray-400">{profile.headline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {stats.ratingAvg > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Stars value={stats.ratingAvg} />
                      <strong className="text-gray-900 dark:text-white">{stats.ratingAvg.toFixed(1)}</strong>
                      <span>({stats.reviewsCount.toLocaleString("ar-EG")} تقييم)</span>
                    </span>
                  )}
                  {profile.country && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {profile.country}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button asChild className="min-h-11 font-bold">
                  <a href="#teacher-courses">استكشف الكورسات</a>
                </Button>
              </div>
            </div>

            {/* Stats */}
            {statItems.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statItems.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/[0.03]"
                  >
                    <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <dd className="text-lg font-black text-gray-900 dark:text-white">{value}</dd>
                      <dt className="text-xs font-bold text-gray-500">{label}</dt>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {/* In-page navigation */}
        <nav
          aria-label="أقسام الملف الشخصي"
          className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-gray-200/60 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0B0D14]/95 sm:mx-0 sm:rounded-2xl sm:border sm:px-3"
        >
          <ul className="flex min-w-max gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#teacher-${s.id}`}
                  aria-current={activeSection === s.id ? "true" : undefined}
                  onClick={() => setActiveSection(s.id)}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    activeSection === s.id
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* About */}
        <section id="teacher-about" aria-labelledby="about-heading" className="scroll-mt-24 rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02] sm:p-8">
          <h2 id="about-heading" className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
            عن المدرس
          </h2>
          {bio ? (
            <div className="mt-4">
              <p className="leading-8 text-gray-600 dark:text-gray-300">{bioShown}</p>
              {bioLong && (
                <Button variant="ghost" size="sm" className="mt-2 font-bold text-primary" onClick={() => setBioExpanded((v) => !v)}>
                  {bioExpanded ? "عرض أقل" : "عرض المزيد"}
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-4 text-gray-500">لم يضف المدرس نبذة تعريفية بعد.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {(profile.subjects ?? []).map((s) => (
              <Badge key={`sub-${s}`} className="rounded-full px-3 py-1 font-bold">{s}</Badge>
            ))}
            {(profile.classes ?? []).map((c) => (
              <Badge key={`cls-${c}`} variant="outline" className="rounded-full px-3 py-1 font-bold">{c}</Badge>
            ))}
            {(profile.specialties ?? []).map((s) => (
              <Badge key={`sp-${s}`} variant="secondary" className="rounded-full px-3 py-1 font-bold">
                <Award className="ml-1 h-3.5 w-3.5" aria-hidden />
                {s}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            {profile.experienceYears && <span>سنوات الخبرة: <strong className="text-gray-900 dark:text-white">{profile.experienceYears}</strong></span>}
            {(profile.languages ?? []).length > 0 && <span>اللغات: <strong className="text-gray-900 dark:text-white">{(profile.languages ?? []).join("، ")}</strong></span>}
          </div>
        </section>

        {/* Courses */}
        <section id="teacher-courses" aria-labelledby="courses-heading" className="scroll-mt-24 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="courses-heading" className="text-xl font-black text-gray-900 dark:text-white">
              الكورسات {coursesTotal > 0 && <span className="text-sm font-bold text-gray-400">({coursesTotal.toLocaleString("ar-EG")})</span>}
            </h2>
          </div>

          {coursesError ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-red-400/20 bg-red-400/5 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" aria-hidden />
              <p className="font-bold text-red-200">{coursesError}</p>
              <Button variant="outline" onClick={() => loadCourses(coursesPage)}>إعادة المحاولة</Button>
            </div>
          ) : coursesLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="جارٍ تحميل الكورسات">
              {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-gray-200/60 bg-white p-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <BookOpen className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
              <p className="mt-3 font-bold text-gray-600 dark:text-gray-300">لا توجد كورسات منشورة لهذا المدرس حاليًا.</p>
            </div>
          ) : (
            <>
              {featuredCourses.length > 0 && coursesPage === 1 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">كورسات مميزة</h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {featuredCourses.map((c) => <TeacherCourseCard key={c.id} course={c} teacherName={profile.name} />)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(coursesPage === 1 && featuredCourses.length > 0 ? courses.filter((c) => !c.isFeatured) : courses).map((c) => (
                  <TeacherCourseCard key={c.id} course={c} teacherName={profile.name} />
                ))}
              </div>
              {coursesTotalPages > 1 && (
                <nav aria-label="ترقيم صفحات الكورسات" className="flex items-center justify-center gap-2">
                  <Button variant="outline" disabled={coursesPage <= 1 || coursesLoading} onClick={() => loadCourses(coursesPage - 1)}>
                    السابق
                  </Button>
                  <span className="text-sm font-bold text-gray-500" aria-live="polite">
                    صفحة {coursesPage.toLocaleString("ar-EG")} من {coursesTotalPages.toLocaleString("ar-EG")}
                  </span>
                  <Button variant="outline" disabled={coursesPage >= coursesTotalPages || coursesLoading} onClick={() => loadCourses(coursesPage + 1)}>
                    التالي
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>

        {/* Reviews */}
        <section id="teacher-reviews" aria-labelledby="reviews-heading" className="scroll-mt-24 space-y-6 rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02] sm:p-8">
          <h2 id="reviews-heading" className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
            <MessageSquareText className="h-5 w-5 text-primary" aria-hidden />
            التقييمات
          </h2>
          {reviewsLoading ? (
            <div className="space-y-4" aria-label="جارٍ تحميل التقييمات">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" aria-hidden />
              <p className="font-bold text-red-200">{reviewsError}</p>
              <Button variant="outline" size="sm" onClick={() => loadReviews(reviewsPage)}>إعادة المحاولة</Button>
            </div>
          ) : !reviewsSummary || reviewsSummary.total === 0 ? (
            <p className="py-6 text-center font-medium text-gray-500">لا توجد تقييمات حتى الآن.</p>
          ) : (
            <>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="text-center sm:min-w-32">
                  <p className="text-5xl font-black text-gray-900 dark:text-white">{reviewsSummary.average.toFixed(1)}</p>
                  <Stars value={reviewsSummary.average} className="mt-2 h-5 w-5 justify-center" />
                  <p className="mt-1 text-xs font-bold text-gray-500">{reviewsSummary.total.toLocaleString("ar-EG")} تقييم</p>
                </div>
                <div className="flex-1 space-y-1.5" aria-label="توزيع التقييمات">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewsSummary.distribution[String(star)] ?? 0;
                    const pct = reviewsSummary.total > 0 ? Math.round((count / reviewsSummary.total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <span className="w-6 shrink-0">{star} ★</span>
                        <Progress value={pct} className="h-2 flex-1" aria-label={`${pct}% قيّموا بـ ${star}`} />
                        <span className="w-10 shrink-0 text-left">{count.toLocaleString("ar-EG")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {reviews.map((r) => (
                  <li key={r.id} className="py-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={r.reviewerAvatar || undefined} alt={`صورة ${r.reviewerName}`} />
                        <AvatarFallback className="bg-primary/10 font-black text-primary">
                          {r.reviewerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{r.reviewerName}</p>
                          {r.isVerifiedEnrollment && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                              طالب مشترك
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <Stars value={r.rating} className="h-3.5 w-3.5" />
                          {r.courseName && <span>في كورس: {r.courseName}</span>}
                          <time dateTime={r.createdAt}>
                            {new Date(r.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                          </time>
                        </div>
                        {r.comment && <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">{r.comment}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {reviewsTotalPages > 1 && (
                <nav aria-label="ترقيم صفحات التقييمات" className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled={reviewsPage <= 1 || reviewsLoading} onClick={() => loadReviews(reviewsPage - 1)}>
                    السابق
                  </Button>
                  <span className="text-sm font-bold text-gray-500" aria-live="polite">
                    صفحة {reviewsPage.toLocaleString("ar-EG")} من {reviewsTotalPages.toLocaleString("ar-EG")}
                  </span>
                  <Button variant="outline" size="sm" disabled={reviewsPage >= reviewsTotalPages || reviewsLoading} onClick={() => loadReviews(reviewsPage + 1)}>
                    التالي
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function TeacherCourseCard({ course, teacherName }: { course: TeacherPublicCourse; teacherName: string }) {
  const cta = courseCta(course);
  const title = course.nameAr || course.name;
  const [imgError, setImgError] = useState(false);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-colors hover:border-primary/50 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-white/5">
        {course.thumbnailUrl && !imgError ? (
          <Image
            src={course.thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary/20 to-violet-500/10" aria-hidden>
            <BookOpen className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {course.isFeatured && (
            <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-white">مميز</span>
          )}
          {course.price === 0 && (
            <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">مجاني</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 text-base font-bold text-gray-900 group-hover:text-primary dark:text-white">
          <Link href={cta.href}>{title}</Link>
        </h3>
        {(course.shortDescription || course.description) && (
          <p className="mb-3 line-clamp-2 text-xs leading-6 text-gray-500">
            {course.shortDescription || course.description}
          </p>
        )}
        <div className="mb-3 mt-auto flex items-center justify-between border-y border-gray-100 py-2.5 text-xs text-gray-500 dark:border-white/5">
          {typeof course.rating === "number" && course.rating > 0 ? (
            <span className="flex items-center gap-1 font-bold text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {course.rating.toFixed(1)}
            </span>
          ) : (
            <span>لا يوجد تقييم بعد</span>
          )}
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {course.enrolledCount.toLocaleString("ar-EG")}
            </span>
            {!!course.durationHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {course.durationHours.toLocaleString("ar-EG")} س
              </span>
            )}
          </span>
        </div>
        {course.isEnrolled && typeof course.progress === "number" && (
          <div className="mb-3">
            <Progress value={course.progress} className="h-2" aria-label={`نسبة التقدم ${Math.round(course.progress)}%`} />
            <p className="mt-1 text-[11px] font-bold text-gray-500">تقدمك: {Math.round(course.progress)}%</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-base font-black text-primary">
            {course.price > 0 ? `${course.price} ج.م` : "مجانًا"}
          </span>
          {cta.disabled ? (
            <span className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-400 dark:bg-white/5">
              {cta.label}
            </span>
          ) : (
            <Link
              href={cta.href}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                cta.primary
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
              }`}
            >
              {cta.label}
            </Link>
          )}
        </div>
        <span className="sr-only">المدرس: {teacherName}</span>
      </div>
    </article>
  );
}

export function TeacherProfileSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8" dir="rtl" aria-label="جارٍ تحميل الملف الشخصي">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function TeacherProfileError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center" dir="rtl">
      {reviewsErrorIcon()}
      <p className="font-bold text-gray-600 dark:text-gray-300">تعذر تحميل الملف الشخصي للمدرس.</p>
      <div className="flex gap-3">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <Loader2 className="ml-2 h-4 w-4" aria-hidden />
            إعادة المحاولة
          </Button>
        )}
        <Button asChild>
          <Link href="/teachers">العودة إلى المدرسين</Link>
        </Button>
      </div>
    </div>
  );
}

function reviewsErrorIcon() {
  return <AlertCircle className="h-12 w-12 text-red-400" aria-hidden />;
}
