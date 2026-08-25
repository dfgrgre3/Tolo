'use client';

import Link from 'next/link';
import { ArrowLeft, Zap, Award, Clock } from 'lucide-react';
import { CONTAINER } from '../design-system';

/**
 * PromotionalCTASection
 *
 * Displays promotional messaging and calls-to-action
 * to encourage course enrollment and platform engagement
 *
 * This section is flexible and can be updated with campaigns
 */
export function PromotionalCTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-[#0F766E] to-emerald-700 dark:from-orange-600 dark:to-orange-700 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className={`relative z-10 ${CONTAINER.className}`}>
        <div className="max-w-2xl">
          {/* Main Message */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight">
            ابدأ رحلة التعلم اليوم
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-xl leading-relaxed font-medium">
            انضم إلى آلاف المتعلمين الذين غيّروا حياتهم من خلال تعليم عملي وعالي الجودة.
          </p>

          {/* Features Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">تعلم سريع</p>
                <p className="text-xs text-white/70">محاضرات مركزة وفعالة</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">شهادات معتمدة</p>
                <p className="text-xs text-white/70">شهادات قابلة للمشاركة</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">تعلم بوقتك</p>
                <p className="text-xs text-white/70">درس متى تشاء</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/courses"
              className="
                inline-flex items-center gap-2
                px-6 py-3 bg-white text-[#0F766E] dark:text-orange-600
                font-bold rounded-[8px]
                hover:bg-slate-100 dark:hover:bg-slate-100
                transition-all duration-150
              "
            >
              استكشف الكورسات
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/instructors"
              className="
                inline-flex items-center gap-2
                px-6 py-3 bg-white/20 hover:bg-white/30
                border border-white/30 text-white
                font-bold rounded-[8px]
                transition-all duration-150
              "
            >
              تصفح المدرسين
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
