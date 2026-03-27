"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  Clock,
  Layers3,
  Loader2,
  PlayCircle,
  Shield,
  Star,
  Users,
  Zap,
  Heart,
  Share2,
  ExternalLink,
  Download,
  Award,
  GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  certificateAvailable?: boolean;
  language?: string;
  lastUpdated?: string;
}

const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  EASY: { label: "سهل", color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-400/10" },
  MEDIUM: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-400/10" },
  ADVANCED: { label: "متقدم", color: "text-rose-400", bgColor: "bg-rose-400/10" },
  HARD: { label: "صعب", color: "text-rose-400", bgColor: "bg-rose-400/10" },
  EXPERT: { label: "خبير", color: "text-purple-400", bgColor: "bg-purple-400/10" },
};

const STYLES = {
  card: "group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/4 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  neonText: "rpg-neon-text font-black",
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
  index = 0,
  isWishlisted = false,
  onWishlistToggle,
  certificateAvailable = false,
  language = "العربية",
  lastUpdated,
}) => {
  const levelInfo = levelConfig[level] || levelConfig.INTERMEDIATE;
  const safeProgress = Math.max(0, Math.min(progress ?? 0, 100));
  const visibleTags = tags.slice(0, 2);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      className={STYLES.card + (featured ? " ring-2 ring-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.2)]" : "")}
      dir="rtl"
    >
      <div className="relative h-52 overflow-hidden sm:h-56">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-black via-[#0f172a] to-[#1e1b4b]">
            <BookOpen className="h-20 w-20 text-white/10 transition-transform duration-700 group-hover:scale-110" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="border border-white/10 bg-white/10 px-3 py-1 font-bold text-white backdrop-blur-xl">
              {subject}
            </Badge>
            {lessonsCount ? (
              <Badge className="border border-white/10 bg-black/35 px-3 py-1 font-bold text-white backdrop-blur-xl">
                <Layers3 className="ml-1 h-3.5 w-3.5" />
                {lessonsCount} درس
              </Badge>
            ) : null}
          </div>

          {certificateAvailable && (
            <Badge className="flex items-center gap-1 border-2 border-yellow-500/20 bg-yellow-500/10 px-3 py-1 font-black text-yellow-500 backdrop-blur-xl">
              <Award className="h-3 w-3 fill-current" />
              <span>شهادة</span>
            </Badge>
          )}

          {featured ? (
            <Badge className="flex items-center gap-1 border-2 border-black/20 bg-amber-500 px-3 py-1 font-black text-black shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              <span>مميزة</span>
            </Badge>
          ) : null}
        </div>

        <div className="absolute bottom-4 right-4">
          <Badge className={`${levelInfo.bgColor} ${levelInfo.color} border border-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest`}>
            {levelInfo.label}
          </Badge>
        </div>

        <div className="absolute inset-0 flex scale-50 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/50 bg-primary/20 backdrop-blur-3xl">
            <PlayCircle className="h-10 w-10 fill-primary/20 text-primary" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 text-right sm:p-6">
        {enrolled && progress !== undefined ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-gray-500">معدل التقدم</span>
              <span className="text-primary">{safeProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${safeProgress}%` }}
                className="h-full bg-gradient-to-r from-primary to-purple-600"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Link href={`/courses/${id}`} className="block">
            <h3 className="line-clamp-2 text-lg font-black leading-snug text-white transition-colors group-hover:text-primary sm:text-xl">
              {title}
            </h3>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px]">
              {instructor.charAt(0)}
            </span>
            <span className="line-clamp-1">بواسطة: {instructor}</span>
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-gray-400">{description}</p>

        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-[11px] font-bold text-gray-500">التقييم</span>
            </div>
            <span className="text-sm font-black text-white">{rating.toFixed(1)}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-[11px] font-bold text-gray-500">الطلاب</span>
            </div>
            <span className="text-sm font-black text-white">{enrolledCount.toLocaleString()}</span>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-1">
            <div className="mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-[11px] font-bold text-gray-500">المدة</span>
            </div>
            <span className="text-sm font-black text-white">{duration} ساعة</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-2xl font-black">
            {price === 0 ? (
              <span className={STYLES.neonText + " text-emerald-500"}>مجاني</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-white">{price}</span>
                <span className="text-xs font-bold text-gray-500">EGP</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 sm:min-w-[188px] sm:justify-end">
            {enrolled ? (
              <>
                <Link href={`/courses/${id}`} className="flex-1">
                  <Button className="h-11 w-full gap-2 rounded-xl border border-white/10 bg-white/10 font-black text-white hover:bg-white/20">
                    <Zap className="h-4 w-4 fill-primary text-primary" />
                    <span>متابعة</span>
                  </Button>
                </Link>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onWishlistToggle}
                  className={`h-11 w-11 rounded-xl transition-colors ${
                    isWishlisted 
                      ? "bg-red-500/10 text-red-500" 
                      : "hover:bg-white/10"
                  }`}
                >
                  <Heart className={`h-4 w-4 fill-current ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </>
            ) : (
              <Button
                onClick={onEnroll}
                disabled={isProcessing}
                className="h-11 flex-1 gap-2 rounded-xl bg-primary px-6 font-black text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                <span>سجل الآن</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigator.share ? navigator.share({
                title: title,
                text: `انظر هذه الدورة التعليمية: ${description}`,
                url: window.location.origin + `/courses/${id}`
              }) : null}
              className="h-11 w-11 rounded-xl transition-colors hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default CourseCard;
