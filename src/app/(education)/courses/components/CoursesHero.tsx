"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  Star,
  BookOpen,
  Sparkles,
  TrendingUp,
  Award,
  Play } from

"lucide-react";

import { cn } from "@/lib/utils";

interface CoursesHeroProps {
  totalCourses: number;
  totalStudents: number;
  totalInstructors: number;
  avgRating: number;
}

const container = {
  hidden: { opacity: 0 as const },
  show: {
    opacity: 1 as const,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0 as const, y: 20 },
  show: { opacity: 1 as const, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } }
};

export const CoursesHero: React.FC<CoursesHeroProps> = ({
  totalCourses,
  totalStudents,
  totalInstructors,
  avgRating
}) => {
  const stats = [
  { icon: BookOpen, value: totalCourses, label: "دورة تعليمية", suffix: "+", color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10", text: "text-blue-500" },
  { icon: Users, value: totalStudents, label: "طالب مسجل", suffix: "+", color: "from-violet-500 to-purple-500", bg: "bg-violet-500/10", text: "text-violet-500" },
  { icon: GraduationCap, value: totalInstructors, label: "معلم متخصص", suffix: "+", color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10", text: "text-amber-500" },
  { icon: Star, value: avgRating, label: "متوسط التقييم", suffix: "/5", color: "from-emerald-500 to-green-500", bg: "bg-emerald-500/10", text: "text-emerald-500" }];


  return (
    <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-white/[0.06] p-8 md:p-12 lg:p-16">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,109,0,0.03),transparent_50%)]" />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center text-center gap-10">
        
        {/* Top badge */}
        <motion.div variants={item}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            <span>منصة تعليمية متكاملة</span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.div variants={item} className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-gray-900 dark:text-white">
            اكتشف عالم
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-amber-500">
              التعلم بلا حدود
            </span>
          </h1>
          <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            استكشف مئات الدورات التعليمية المصممة بعناية لتطوير مهاراتك.
            اختر مسارك التعليمي وابدأ رحلتك نحو التميز اليوم.
          </p>
        </motion.div>

        {/* Feature badges */}
        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-3">
          {[
          { icon: TrendingUp, text: "محتوى محدّث", color: "text-emerald-500" },
          { icon: Award, text: "شهادات معتمدة", color: "text-amber-500" },
          { icon: Play, text: "فيديوهات عالية الجودة", color: "text-blue-500" }].
          map((feature, i) =>
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-white/5 px-3.5 py-2 text-sm">
            
              <feature.icon className={cn("h-4 w-4", feature.color)} />
              <span className="font-medium text-gray-600 dark:text-gray-300">{feature.text}</span>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
          
          {stats.map((stat, index) =>
          <motion.div
            key={index}
            whileHover={{ y: -4 }}
            className="group relative rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-5 text-center transition-all duration-300 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-lg">
            
              <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.text)} />
              </div>
              <div className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white" suppressHydrationWarning>
                {typeof stat.value === "number" && stat.value >= 1000 ?
              `${(stat.value / 1000).toFixed(1)}K` :
              stat.value}
                <span className="text-sm font-bold text-gray-400 mr-0.5">{stat.suffix}</span>
              </div>
              <div className="text-xs font-medium text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>);

};

export default CoursesHero;