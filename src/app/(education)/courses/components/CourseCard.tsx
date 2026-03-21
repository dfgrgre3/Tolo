"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
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
  Loader2,
  Zap,
  Sword,
  Shield,
  Sparkles
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
}

const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  EASY: { label: "سهل", color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-400/10" },
  MEDIUM: { label: "متوسط", color: "text-amber-400", bgColor: "bg-amber-400/10" },
  ADVANCED: { label: "متقدم", color: "text-rose-400", bgColor: "bg-rose-400/10" },
  HARD: { label: "صعب", color: "text-rose-400", bgColor: "bg-rose-400/10" },
  EXPERT: { label: "أستاذ", color: "text-purple-400", bgColor: "bg-purple-400/10" }
};

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full flex flex-col group",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
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
  const levelInfo = levelConfig[level] || levelConfig.INTERMEDIATE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -10 }}
      className={STYLES.card + (featured ? " ring-2 ring-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.2)]" : "")}
    >
      {/* Thumbnail Area */}
      <div className="relative h-56 overflow-hidden">
        {thumbnailUrl ? (
          <Image 
            src={thumbnailUrl} 
            alt={title} 
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-black via-[#0f172a] to-[#1e1b4b] flex items-center justify-center">
             <BookOpen className="w-20 h-20 text-white/10 group-hover:scale-110 transition-transform duration-700" />
          </div>
        )}
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
        
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
           {featured && (
             <Badge className="bg-amber-500 text-black font-black px-3 py-1 border-2 border-black/20 shadow-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>مخطوطة ممتازة</span>
             </Badge>
           )}
           <Badge className="bg-white/10 backdrop-blur-xl border border-white/10 text-white font-bold py-1 px-3">
              {subject}
           </Badge>
        </div>

        <div className="absolute bottom-4 right-4">
           <Badge className={`${levelInfo.bgColor} ${levelInfo.color} border border-white/5 font-black px-3 py-1 uppercase tracking-widest text-[10px]`}>
              {levelInfo.label}
           </Badge>
        </div>

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
           <div className="h-16 w-16 rounded-full bg-primary/20 backdrop-blur-3xl border border-primary/50 flex items-center justify-center">
              <PlayCircle className="w-10 h-10 text-primary fill-primary/20" />
           </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex flex-col flex-grow gap-4 text-right" dir="rtl">
        
        {/* Progress for enrolled */}
        {enrolled && progress !== undefined && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
               <span className="text-gray-500">معدل التزامن</span>
               <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 className="h-full bg-gradient-to-r from-primary to-purple-600"
               />
            </div>
          </div>
        )}

        <div className="space-y-2">
           <Link href={`/courses/${id}`}>
              <h3 className="text-xl font-black text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {title}
              </h3>
           </Link>
           <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-[10px]">
                 {instructor.charAt(0)}
              </span>
              <span>بواسطة: {instructor}</span>
           </div>
        </div>

        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
           {description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                 <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                 <span className="text-sm font-black text-white">{rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <Users className="w-4 h-4 text-gray-500" />
                 <span className="text-sm font-bold text-gray-400">{enrolledCount.toLocaleString()}</span>
              </div>
           </div>
           
           <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">{duration} ساعة</span>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
           <div className="text-2xl font-black">
              {price === 0 ? (
                <span className={STYLES.neonText + " text-emerald-500"}>مجاني</span>
              ) : (
                <div className="flex items-baseline gap-1">
                   <span className="text-white">{price}</span>
                   <span className="text-xs text-gray-500 font-bold">نقود</span>
                </div>
              )}
           </div>

           <div className="flex gap-2">
              {enrolled ? (
                <Link href={`/courses/${id}`} className="flex-1">
                   <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-black rounded-xl border border-white/10 h-10 gap-2">
                      <Zap className="w-4 h-4 fill-primary text-primary" />
                      <span>دخول</span>
                   </Button>
                </Link>
              ) : (
                <Button 
                   onClick={onEnroll}
                   disabled={isProcessing}
                   className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl h-10 px-6 shadow-lg shadow-primary/20 gap-2"
                >
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                   <span>سجل الآن</span>
                </Button>
              )}
              {enrolled && (
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={onUnenroll}
                   className="h-10 w-10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                   <Bookmark className="w-4 h-4 fill-current" />
                </Button>
              )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CourseCard;
