"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  PlayCircle,
  ChevronLeft,
  Bookmark,
  GraduationCap,
  Loader2
} from "lucide-react";

export interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  tags: string[];
  enrolled: boolean;
  progress?: number;
  lessonsCount?: number;
  onEnroll?: () => void;
  onUnenroll?: () => void;
  isProcessing?: boolean;
  featured?: boolean;
  index?: number;
}

const levelConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  BEGINNER: {
    label: "مبتدئ",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20"
  },
  EASY: {
    label: "سهل",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20"
  },
  INTERMEDIATE: {
    label: "متوسط",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20"
  },
  MEDIUM: {
    label: "متوسط",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20"
  },
  ADVANCED: {
    label: "متقدم",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20"
  },
  HARD: {
    label: "صعب",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20"
  },
  EXPERT: {
    label: "خبير",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20"
  }
};

export const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  instructor,
  subject,
  level,
  duration,
  thumbnailUrl,
  price,
  rating,
  enrolledCount,
  tags,
  enrolled,
  progress,
  lessonsCount,
  onEnroll,
  onUnenroll,
  isProcessing = false,
  featured = false,
  index = 0
}) => {
  const levelInfo = levelConfig[level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative flex flex-col rounded-3xl overflow-hidden border ${
        featured 
          ? "border-blue-300/50 shadow-xl shadow-blue-500/10" 
          : "border-slate-200/80 dark:border-slate-700/50"
      } bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:border-blue-300/60`}
    >
      {/* Glowing effect on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/0 via-purple-400/0 to-pink-400/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-4 right-4 z-20">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg"
          >
            <Star className="h-3 w-3 fill-current" />
            <span>مميز</span>
          </motion.div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden">
        {thumbnailUrl ? (
          <motion.img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            >
              <GraduationCap className="h-20 w-20 text-blue-400/60" />
            </motion.div>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Subject badge */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-xs font-medium text-slate-700 dark:text-slate-200 shadow-lg">
            {subject}
          </span>
        </div>
        
        {/* Level badge */}
        <div className="absolute bottom-3 left-3">
          <span className={`px-3 py-1.5 rounded-full ${levelInfo.bg} ${levelInfo.text} ${levelInfo.border} border text-xs font-medium backdrop-blur-sm`}>
            {levelInfo.label}
          </span>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="h-16 w-16 rounded-full bg-white/95 shadow-xl flex items-center justify-center cursor-pointer"
          >
            <PlayCircle className="h-8 w-8 text-blue-600" />
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-grow p-5">
        {/* Progress bar for enrolled courses */}
        {enrolled && progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">التقدم</span>
              <span className="font-semibold text-blue-600">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <Link href={`/courses/${id}`}>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors duration-300">
            {title}
          </h3>
        </Link>

        {/* Instructor */}
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {instructor.charAt(0)}
          </span>
          {instructor}
        </p>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 flex-grow">
          {description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-4">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{rating.toFixed(1)}</span>
            </div>
            
            {/* Students */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{enrolledCount.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Duration and lessons */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{duration} ساعة</span>
            </div>
            {typeof lessonsCount === "number" && lessonsCount > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{lessonsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-500">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          {/* Price */}
          <div className="flex items-center gap-2">
            {price === 0 ? (
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                مجاني
              </span>
            ) : (
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {price} <span className="text-sm font-normal text-muted-foreground">ريال</span>
              </span>
            )}
          </div>

          {/* Action button */}
          {enrolled ? (
            <div className="flex items-center gap-2">
              <Link href={`/courses/${id}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow duration-300"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>متابعة</span>
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onUnenroll}
                disabled={isProcessing}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-rose-500 hover:border-rose-300 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4 fill-current" />}
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnroll}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التنفيذ...</span>
                </>
              ) : (
                <>
                  <span>{price === 0 ? "سجل مجاناً" : "سجل الآن"}</span>
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CourseCard;

