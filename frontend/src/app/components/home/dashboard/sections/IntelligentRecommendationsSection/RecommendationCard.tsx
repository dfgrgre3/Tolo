"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Target,
  ArrowRight,
  Lightbulb,
  Zap,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import type { Recommendation } from "../../shared/types";

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

const iconMap: Record<string, React.ReactNode> = {
  target: <Target className="h-5 w-5" />,
  book: <BookOpen className="h-5 w-5" />,
  "book-open": <BookOpen className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  "check-circle-2": <CheckCircle2 className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />
};

/** Describes the impact score in words, matching the value actually returned. */
function impactLabel(impact: number): string {
  if (impact >= 80) return "تأثير عالي";
  if (impact >= 60) return "تأثير متوسط";
  return "تأثير منخفض";
}

export const RecommendationCard = ({ recommendation, index }: RecommendationCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "أولوية قصوى";
      case "medium":
        return "أولوية متوسطة";
      default:
        return "أولوية عادية";
    }
  };

  return (
    <div
    >
      <Card className="h-full bg-white/5 border-white/5 hover:border-primary/30 overflow-hidden group relative shadow-xl hover:bg-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-500/5 opacity-0 group-hover:opacity-100" />
        
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10 shadow-inner">
                {typeof recommendation.icon === 'string' 
                  ? (iconMap[recommendation.icon] || <Sparkles className="h-5 w-5 text-primary" />)
                  : recommendation.icon}
              </div>
              <Badge className={`${getPriorityColor(recommendation.priority)} text-[10px] uppercase font-black tracking-widest`}>
                {getPriorityLabel(recommendation.priority)}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Zap className="h-3 w-3 fill-current" />
              <span>{impactLabel(recommendation.impact)}</span>
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-primary leading-tight">
            {recommendation.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
            {recommendation.description}
          </p>

          <div className="flex flex-wrap gap-4">
            {recommendation.estimatedTime && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                <Clock className="h-3 w-3" />
                <span>{recommendation.estimatedTime}</span>
              </div>
            )}
          </div>

          {/* Impact Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span>درجة الأولوية</span>
              <span className="text-primary">{recommendation.impact}%</span>
            </div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden ring-1 ring-white/5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
              />
            </div>
          </div>

          {recommendation.actionUrl ? (
            <Link href={recommendation.actionUrl} className="block mt-2">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl shadow-lg shadow-primary/20 active:scale-95">
                <span>بدء التنفيذ</span>
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          ) : (
            <div className="block mt-2 opacity-50 cursor-not-allowed">
              <Button className="w-full bg-muted text-muted-foreground font-bold h-11 rounded-xl cursor-not-allowed" disabled>
                <span>غير متاح حالياً</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecommendationCard;
