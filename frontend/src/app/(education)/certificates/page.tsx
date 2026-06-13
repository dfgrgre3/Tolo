"use client";

import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Award,
  Trophy,
  Search,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCertificates } from "@/features/certificates/hooks/useCertificates";
import { CertificateCard } from "@/features/certificates/components/CertificateCard";

export default function CertificatesPage() {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    filteredCertificates,
    certificateCourses,
  } = useCertificates();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">جاري تحميل شهاداتك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.02] blur-[130px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                  شهاداتي وإنجازاتي
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  استعرض وشارك وثائق إتمام الدورات التعليمية المعتمدة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن شهادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 pr-10 pl-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </m.div>

        {/* Empty State vs Grid */}
        {filteredCertificates.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] backdrop-blur-sm"
          >
            <div className="h-16 w-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              {certificateCourses.length === 0 ? "لا توجد شهادات بعد" : "لا توجد نتائج بحث مطابقة"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm text-center">
              {certificateCourses.length === 0
                ? "أكمل إحدى الدورات التدريبية بنسبة 100% لتحصل على شهادة معتمدة موثقة."
                : "جرب تغيير كلمات البحث للوصول للشهادة المطلوبة."}
            </p>
            {certificateCourses.length === 0 && (
              <Link href="/my-courses">
                <Button className="gap-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                  <BookOpen className="h-4 w-4" />
                  <span>متابعة دوراتي الحالية</span>
                </Button>
              </Link>
            )}
          </m.div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredCertificates.map((course, index) => (
                <CertificateCard
                  key={course.id}
                  course={course}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

