"use client";

import React, { Suspense, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Award, Sparkles, Brain, BarChart3, FileText, MessageSquare, Calendar, Trophy, Clock, Flame, CheckCircle2, Target, ArrowRight } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { LazyLoadSection } from "@/components/ui/LazyLoadSection";
import { StatCard } from "./StatCard";
import { FeatureCard } from "./FeatureCard";
import { scrollVariants, highlightCards } from "./constants";
import { ProgressSummary } from "@/lib/server-data-fetch";

// Optimize dynamic imports for better performance
const HeroSection = dynamic(() => import("@/components/home/sections/HeroSectionEnhanced"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-64 rounded-lg" />
});

const QuickLinksSection = dynamic(() => import("@/components/home/sections/QuickLinksSectionEnhanced"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const TipsSection = dynamic(() => import("@/components/home/sections/TipsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AchievementsSection = dynamic(() => import("@/components/home/sections/AchievementsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const ExamsSection = dynamic(() => import("@/components/home/sections/ExamsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AnalyticsSection = dynamic(() => import("@/components/home/sections/AnalyticsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const FeaturesSection = dynamic(() => import("@/components/home/sections/FeaturesSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const IntelligentRecommendationsSection = dynamic(() => import("@/components/home/sections/IntelligentRecommendationsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const LiveActivityFeedSection = dynamic(() => import("@/components/home/sections/LiveActivityFeedSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const AdvancedSearchSection = dynamic(() => import("@/components/home/sections/AdvancedSearchSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const PerformanceDashboardSection = dynamic(() => import("@/components/home/sections/PerformanceDashboardSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const SocialFeaturesSection = dynamic(() => import("@/components/home/sections/SocialFeaturesSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const ProgressPredictionsSection = dynamic(() => import("@/components/home/sections/ProgressPredictionsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

const StatusIndicatorsSection = dynamic(() => import("@/components/home/sections/StatusIndicatorsSection"), { 
  ssr: true,
  loading: () => <SkeletonLoader className="h-48 rounded-lg" />
});

interface GuestHomeProps {
  summary: ProgressSummary | null;
  user?: any; // Optional user prop for conditional rendering inside components if needed
}

export function GuestHome({ summary, user }: GuestHomeProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sectionShell = "relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md";

  return (
    <Layout>
      <motion.div 
        className="relative min-h-screen overflow-hidden bg-slate-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[540px] bg-gradient-to-b from-blue-100 via-transparent to-transparent opacity-80 blur-2xl" />
          <div className="absolute left-[18%] top-[20%] h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute right-[12%] top-[40%] h-80 w-80 translate-x-1/3 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.12),_transparent_60%)]" />
        </div>
        <div className="relative mx-auto max-w-7xl space-y-12 sm:space-y-16 md:space-y-20 lg:space-y-24 px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-16">
          {/* Optimize scrolling behavior with CSS */}
          <style jsx global>{`
            html {
              scroll-behavior: smooth;
            }
            @media (prefers-reduced-motion: reduce) {
              html {
                scroll-behavior: auto;
              }
            }
          `}</style>
          
          {/* Hero section with priority loading for LCP improvement */}
          <section className={`${sectionShell} bg-gradient-to-br from-white via-white/80 to-blue-50`}>
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-purple-200/25" />
              <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-200/40 blur-2xl" />
              <div className="absolute bottom-0 right-8 h-40 w-40 rounded-full bg-purple-200/40 blur-3xl" />
            </div>
            <div className="relative z-10">
              <Suspense fallback={<SkeletonLoader className="h-64 rounded-lg" />}>
                <HeroSection summary={summary} priority={true} />
              </Suspense>
            </div>

            {/* Enhanced scroll indicator with animation */}
            <div className="relative z-10 mt-12 md:mt-16 flex justify-center">
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: 10 }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Button
                  onClick={scrollToDashboard}
                  variant="outline"
                  size="lg"
                  className="group bg-white/85 backdrop-blur-md border-blue-200/60 px-8 py-4 transition-all duration-300 shadow-lg hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50 hover:shadow-xl"
                >
                  <span className="text-blue-600 font-medium text-lg">انتقل إلى لوحة التحكم</span>
                  <ChevronDown className="text-blue-500 mr-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Curated quick actions */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-blue-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-transparent to-purple-200/20" />
              <div className="relative z-10 space-y-10">
                <div className="flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-right">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-primary md:text-4xl">إجراءات سريعة للبدء</h2>
                    <p className="text-muted-foreground md:text-lg">ابدأ رحلتك التعليمية بسرعة وكفاءة. اختر من الأدوات والخدمات المتاحة لتسهيل دراستك وتحسين أدائك.</p>
                  </div>
                  <div className="flex justify-center md:justify-end">
                    <Badge className="border-0 bg-blue-50 text-blue-600">جديد: واجهة محسّنة</Badge>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {highlightCards.map((card, index) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="group relative overflow-hidden rounded-2xl border border-slate-100/70 bg-white/80 p-6 shadow-lg transition-all duration-300 hover:border-blue-200/60 hover:shadow-2xl"
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                      <div className="relative z-10 flex h-full flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 group-hover:bg-blue-50 transition-colors duration-300">
                            {card.icon}
                          </div>
                          <Sparkles className="h-5 w-5 text-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-300">{card.title}</h3>
                        <p className="flex-grow text-sm text-muted-foreground md:text-base leading-relaxed">{card.description}</p>
                        <Link
                          href={card.href}
                          className="group/link inline-flex items-center self-start rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-300 hover:bg-blue-100 hover:gap-2"
                        >
                          {card.actionLabel}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </LazyLoadSection>

          {/* Statistics section for non-authenticated users */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-cyan-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/25 via-transparent to-blue-200/25" />
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
                    <span>لوحة الأداء الأسبوعي</span>
                    <Award className="h-8 w-8 text-yellow-500" />
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    {user ? "راقب مؤشراتك الرئيسية لحظة بلحظة وحدد مناطق التحسين قبل أن تتراكم المهام." : "سجل الدخول لمتابعة إحصائياتك الشخصية. راقب مؤشراتك الرئيسية لحظة بلحظة وحدد مناطق التحسين قبل أن تتراكم المهام."}
                  </p>
                  {!user && (
                    <div className="mt-6">
                      <Button asChild className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                        <Link href="/login">سجل الدخول الآن</Link>
                      </Button>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  variants={scrollVariants.staggerChildren}
                  initial="initial"
                  whileInView="whileInView"
                  className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                >
                  <motion.div variants={scrollVariants.staggerItem}>
                    <StatCard
                      icon={<Clock className="h-8 w-8 text-blue-600" />}
                      title="إجمالي وقت الدراسة"
                      value={summary ? Math.round(summary.totalMinutes / 60) : 0}
                      unit="ساعة"
                      color="from-blue-100 to-blue-200"
                    />
                  </motion.div>

                  <motion.div variants={scrollVariants.staggerItem}>
                    <StatCard
                      icon={<Flame className="h-8 w-8 text-orange-600" />}
                      title="أيام الإنجاز المتتالية"
                      value={summary?.streakDays ?? 0}
                      unit="يوم"
                      color="from-orange-100 to-orange-200"
                    />
                  </motion.div>

                  <motion.div variants={scrollVariants.staggerItem}>
                    <StatCard
                      icon={<CheckCircle2 className="h-8 w-8 text-purple-600" />}
                      title="المهام المكتملة"
                      value={summary?.tasksCompleted ?? 0}
                      unit="مهمة"
                      color="from-purple-100 to-purple-200"
                    />
                  </motion.div>

                  <motion.div variants={scrollVariants.staggerItem}>
                    <StatCard
                      icon={<Target className="h-8 w-8 text-green-600" />}
                      title="نسبة الالتزام الأسبوعية"
                      value={summary?.averageFocus ?? 0}
                      unit="%"
                      color="from-green-100 to-green-200"
                    />
                  </motion.div>
                </motion.div>
              </div>
            </section>
          </LazyLoadSection>

          {/* Enhanced Features Section */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-indigo-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/25 via-transparent to-purple-200/25" />
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
                    <span>المميزات والخدمات</span>
                    <Sparkles className="h-8 w-8 text-yellow-500" />
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto text-lg">اكتشف الأدوات والخدمات المتقدمة التي تساعدك على تحسين أدائك الأكاديمي.</p>
                </motion.div>

                <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  <FeatureCard
                    icon={<Brain className="h-8 w-8 text-blue-600" />}
                    title="المساعد الذكي بالذكاء الاصطناعي"
                    description="احصل على مساعدة ذكية في الدراسة والتحضير للامتحانات باستخدام الذكاء الاصطناعي."
                    link="/ai"
                    delay={0.1}
                  />

                  <FeatureCard
                    icon={<BarChart3 className="h-8 w-8 text-purple-600" />}
                    title="تحليلات متقدمة وتقارير مفصلة"
                    description="تابع تقدمك الدراسي مع تحليلات شاملة وتقارير تفصيلية عن أدائك."
                    link="/analytics"
                    delay={0.2}
                  />

                  <FeatureCard
                    icon={<FileText className="h-8 w-8 text-green-600" />}
                    title="امتحانات تجريبية تفاعلية"
                    description="اختبر معلوماتك مع امتحانات تجريبية شاملة تساعدك على التحضير الجيد."
                    link="/exams"
                    delay={0.3}
                  />

                  <FeatureCard
                    icon={<MessageSquare className="h-8 w-8 text-amber-600" />}
                    title="منتدى تفاعلي للمذاكرة"
                    description="انضم إلى مجتمع الطلاب وشارك في النقاشات والاستفسارات التعليمية."
                    link="/forum"
                    delay={0.4}
                  />

                  <FeatureCard
                    icon={<Calendar className="h-8 w-8 text-red-600" />}
                    title="جدولة ذكية للمذاكرة"
                    description="نظم جدول دراستك بشكل ذكي وفعال مع تذكيرات تلقائية للمهام."
                    link="/schedule"
                    delay={0.5}
                  />

                  <FeatureCard
                    icon={<Trophy className="h-8 w-8 text-indigo-600" />}
                    title="نظام إنجازات ومكافآت"
                    description="احصل على شارات ومكافآت عند إكمال المهام وتحقيق الأهداف الدراسية."
                    link="/achievements"
                    delay={0.6}
                  />
                </div>
              </div>
            </section>
          </LazyLoadSection>

          {/* Advanced Search section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <AdvancedSearchSection />
            </Suspense>
          </LazyLoadSection>

          {/* Intelligent Recommendations section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <IntelligentRecommendationsSection />
            </Suspense>
          </LazyLoadSection>

          {/* Live Activity Feed section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <LiveActivityFeedSection />
            </Suspense>
          </LazyLoadSection>

          {/* Quick Links section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-indigo-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/25 via-transparent to-purple-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <QuickLinksSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>

          {/* Daily Tips section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-emerald-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/25 via-transparent to-teal-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <TipsSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>

          {/* Achievements section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-amber-100/60`} ref={dashboardRef}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200/25 via-transparent to-orange-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <AchievementsSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>

          {/* Exams section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-rose-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-rose-200/25 via-transparent to-pink-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <ExamsSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>

          {/* Analytics section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-sky-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200/25 via-transparent to-cyan-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <AnalyticsSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>

          {/* Performance Dashboard section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <PerformanceDashboardSection />
            </Suspense>
          </LazyLoadSection>

          {/* Progress Predictions section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <ProgressPredictionsSection />
            </Suspense>
          </LazyLoadSection>

          {/* Social Features section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <SocialFeaturesSection />
            </Suspense>
          </LazyLoadSection>

          {/* Status Indicators section */}
          <LazyLoadSection>
            <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
              <StatusIndicatorsSection />
            </Suspense>
          </LazyLoadSection>

          {/* Features section with lazy loading */}
          <LazyLoadSection>
            <section className={`${sectionShell} ring-1 ring-fuchsia-100/60`}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-200/25 via-transparent to-pink-200/25" />
              <div className="relative z-10">
                <Suspense fallback={<SkeletonLoader className="h-48 rounded-lg" />}>
                  <FeaturesSection />
                </Suspense>
              </div>
            </section>
          </LazyLoadSection>
        </div>
      </motion.div>
    </Layout>
  );
}
