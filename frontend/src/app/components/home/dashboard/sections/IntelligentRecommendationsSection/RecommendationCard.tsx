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

export const RecommendationCard = ({ recommendation, index: _index }: RecommendationCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-600 border-red-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-primary/10 text-primary-strong border-primary/20";
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
      <Card className="h-full bg-card border-border hover:border-primary/30 overflow-hidden group relative shadow-sm">
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5 border border-border">
                {typeof recommendation.icon === 'string'
                  ? (iconMap[recommendation.icon] || <Sparkles className="h-5 w-5 text-primary-strong" />)
                  : recommendation.icon}
              </div>
              <Badge className={`${getPriorityColor(recommendation.priority)} text-[10px] uppercase font-black tracking-widest`}>
                {getPriorityLabel(recommendation.priority)}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-primary-strong bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Zap className="h-3 w-3 fill-current" />
              <span>{impactLabel(recommendation.impact)}</span>
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary-strong leading-tight">
            {recommendation.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {recommendation.description}
          </p>

          <div className="flex flex-wrap gap-4">
            {recommendation.estimatedTime && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg border border-border">
                <Clock className="h-3 w-3" />
                <span>{recommendation.estimatedTime}</span>
              </div>
            )}
          </div>

          {/* Impact Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>درجة الأولوية</span>
              <span className="text-primary-strong">{recommendation.impact}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          {recommendation.actionUrl ? (
            <Link href={recommendation.actionUrl} className="block mt-2">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl active:scale-95">
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
