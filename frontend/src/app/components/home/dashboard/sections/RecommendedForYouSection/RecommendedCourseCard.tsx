"use client";

import React from "react";
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

export const RecommendedCourseCard = ({ course, index: _index }: RecommendedCourseCardProps) => {
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      "مبتدئ": "bg-emerald-50 text-emerald-600 border-emerald-200",
      "متوسط": "bg-amber-50 text-amber-700 border-amber-200",
      "متقدم": "bg-red-50 text-red-600 border-red-200",
    };
    return colors[level] || "bg-primary/10 text-primary-strong border-primary/20";
  };

  return (
    <div className="h-full"
    >
      <Link href={`/courses/${course.id}`} className="block h-full">
        <Card className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 h-full">
          {/* Match score badge */}
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary-strong">
              <Star className="h-3 w-3 fill-primary text-primary-strong" />
              <span>{course.matchScore}% مطابقة</span>
            </div>
          </div>

          <CardContent className="p-5 pt-8">
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-3 flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary-strong" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary-strong">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{course.subject}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {course.description}
              </p>

              {/* Match Reason */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                <TrendingUp className="h-4 w-4 text-primary-strong mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary-strong leading-relaxed">
                  {course.matchReason}
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  <span>{course.rating}</span>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/70 border-0 text-xs">
                  {course.category}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default RecommendedCourseCard;