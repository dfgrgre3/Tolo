"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Star, TrendingUp, Clock, Users } from "lucide-react";
import Link from "next/link";

interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  rating: number;
  studentsCount: number;
  duration: string;
  level: string;
  image?: string;
  matchReason: string;
  matchScore: number;
}

interface RecommendedCourseCardProps {
  course: RecommendedCourse;
  index: number;
}

export const RecommendedCourseCard = ({ course, index }: RecommendedCourseCardProps) => {
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      "مبتدئ": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      "متوسط": "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "متقدم": "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[level] || "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link href={`/courses/${course.id}`}>
        <Card className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.12)] hover:bg-white/[0.03] h-full">
          {/* Top accent gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-indigo-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Match score badge */}
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/30 text-xs font-bold text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <Star className="h-3 w-3 fill-purple-400 text-purple-400" />
              <span>{course.matchScore}% مطابقة</span>
            </div>
          </div>

          <CardContent className="p-5 pt-8">
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 p-3 ring-1 ring-primary/20 flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{course.subject}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                {course.description}
              </p>

              {/* Match Reason */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                <TrendingUp className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  {course.matchReason}
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <Badge variant="outline" className={`border ${getLevelColor(course.level)}`}>
                  {course.level}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{course.studentsCount}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span>{course.rating}</span>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/5 text-gray-300 hover:bg-white/10 border-0 text-xs">
                  {course.category}
                </Badge>
              </div>
            </div>
          </CardContent>

          {/* Hover glow effect */}
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </Card>
      </Link>
    </m.div>
  );
};

export default RecommendedCourseCard;