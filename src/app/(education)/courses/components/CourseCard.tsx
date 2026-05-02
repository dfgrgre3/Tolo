"use client";

import React from "react";
import { m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {

  Clock,
  Layers3,
  Loader2,
  PlayCircle,
  Star,
  Users,
  Heart,
  Share2,
  Award,
  GraduationCap,

  BarChart3,
  Zap,
  Shield,
  CheckCircle2 } from
"lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  tags?: string[];
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

const levelConfig: Record<string, {label: string;color: string;bgColor: string;borderColor: string;}> = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  EASY: { label: "سهل", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  MEDIUM: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  ADVANCED: { label: "متقدم", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  HARD: { label: "صعب", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  EXPERT: { label: "خبير", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" }
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
  tags = [],
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
  certificateAvailable = false
}) => {
  const levelInfo = levelConfig[level] || levelConfig.INTERMEDIATE;
  const safeProgress = Math.max(0, Math.min(progress ?? 0, 100));
  const visibleTags = (tags || []).slice(0, 2);
  const _ratingStars = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <m.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -6 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-500",
        "dark:bg-gray-900/80 dark:backdrop-blur-xl dark:border-white/[0.06]",
        "hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-primary/10",
        featured && "ring-2 ring-primary/30 dark:ring-primary/40"
      )}
      dir="rtl">
      
      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden sm:h-52">
        {thumbnailUrl ?
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110" /> :


        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-black">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
              <GraduationCap className="relative h-16 w-16 text-gray-300 dark:text-white/10 transition-transform duration-700 group-hover:scale-110" />
            </div>
          </div>
        }

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="border-0 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
              {subject}
            </Badge>
            {lessonsCount ?
            <Badge className="border-0 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                <Layers3 className="ml-1 h-3 w-3" />
                {lessonsCount} درس
              </Badge> :
            null}
          </div>

          <div className="flex gap-1.5">
            {certificateAvailable &&
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/90 backdrop-blur-md shadow-lg">
                <Award className="h-4 w-4 text-black" />
              </div>
            }
            {featured &&
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/90 backdrop-blur-md shadow-lg animate-pulse">
                <Star className="h-4 w-4 fill-white text-white" />
              </div>
            }
          </div>
        </div>

        {/* Bottom level badge */}
        <div className="absolute bottom-3 right-3">
          <Badge className={cn("border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md", levelInfo.bgColor, levelInfo.color, levelInfo.borderColor)}>
            {levelInfo.label}
          </Badge>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex scale-75 items-center justify-center opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-2xl backdrop-blur-xl border border-white/30">
            <PlayCircle className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Wishlist button */}
        {onWishlistToggle &&
        <button
          onClick={(e) => {e.preventDefault();e.stopPropagation();onWishlistToggle();}}
          className={cn(
            "absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition-all",
            isWishlisted ? "bg-red-500 text-white" : "bg-black/30 text-white/80 hover:bg-red-500/80"
          )}>
          
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </button>
        }
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Progress bar for enrolled */}
        {enrolled && progress !== undefined &&
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5 text-gray-500">
                <BarChart3 className="h-3 w-3" />
                <span>معدل التقدم</span>
              </div>
              <span className={cn(
              "font-black",
              safeProgress >= 80 ? "text-emerald-500" : safeProgress >= 40 ? "text-amber-500" : "text-primary"
            )}>
                {safeProgress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
              <m.div
              initial={{ width: 0 }}
              animate={{ width: `${safeProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                safeProgress >= 80 ?
                "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                safeProgress >= 40 ?
                "bg-gradient-to-r from-amber-500 to-amber-400" :
                "bg-gradient-to-r from-primary to-orange-400"
              )} />
            
            </div>
            {safeProgress === 100 &&
          <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold">مكتمل</span>
              </div>
          }
          </div>
        }

        {/* Title & instructor */}
        <div className="space-y-2">
          <Link href={`/courses/${id}`} className="block">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-gray-900 dark:text-white transition-colors group-hover:text-primary">
              {title}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
              {instructor.charAt(0)}
            </div>
            <span className="text-xs font-medium text-gray-500 line-clamp-1">
              {instructor}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>

        {/* Tags */}
        {visibleTags.length > 0 &&
        <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) =>
          <span
            key={tag}
            className="rounded-lg bg-gray-100 dark:bg-white/5 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-400">
            
                {tag}
              </span>
          )}
            {tags.length > 2 &&
          <span className="rounded-lg bg-gray-100 dark:bg-white/5 px-2.5 py-1 text-[10px] font-medium text-gray-400">
                +{tags.length - 2}
              </span>
          }
          </div>
        }

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-4 border-t border-gray-100 dark:border-white/5 pt-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-gray-700 dark:text-white">{(rating || 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{enrolledCount?.toLocaleString("en") || "0"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{duration} ساعة</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xl font-black">
            {price === 0 ?
            <span className="text-emerald-500">مجاناً</span> :

            <div className="flex items-baseline gap-1">
                <span className="text-gray-900 dark:text-white">{price}</span>
                <span className="text-xs font-bold text-gray-400">ج.م</span>
              </div>
            }
          </div>

          <div className="flex gap-2">
            {enrolled ?
            <Link href={`/learning/${id}`}>
                <Button
                size="sm"
                className="gap-1.5 rounded-xl bg-primary px-4 font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
                
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>متابعة</span>
                </Button>
              </Link> :

            <Button
              size="sm"
              onClick={onEnroll}
              disabled={isProcessing}
              className="gap-1.5 rounded-xl bg-primary px-5 font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
              
                {isProcessing ?
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> :

              <Shield className="h-3.5 w-3.5" />
              }
                <span>سجل الآن</span>
              </Button>
            }

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
              navigator.share ?
              navigator.share({
                title: title,
                text: `اكتشف هذه الدورة: ${title}`,
                url: window.location.origin + `/courses/${id}`
              }) :
              null
              }
              className="h-9 w-9 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
              
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </m.article>);

};

export default CourseCard;
