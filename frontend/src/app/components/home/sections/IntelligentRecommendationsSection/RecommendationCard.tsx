"use client";

import React from "react";
import { m } from "framer-motion";
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

interface Recommendation {
  id: string;
  type: "study_plan" | "task" | "resource" | "tip" | "exam_prep";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: number;
  estimatedTime?: string;
  category: string;
  icon: string | React.ReactNode;
  actionUrl: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

const iconMap: Record<string, React.ReactNode> = {
  target: <Target className="h-5 w-5" />,
  "book-open": <BookOpen className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  "check-circle-2": <CheckCircle2 className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />
};

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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
    >
      <Card className="h-full bg-white/5 border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden group relative shadow-xl hover:bg-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10 shadow-inner group-hover:scale-110 transition-transform">
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
              <span>+{recommendation.impact}% XP</span>
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-primary transition-colors leading-tight">
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
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
              <Target className="h-3 w-3" />
              <span>تأثير عالي</span>
            </div>
          </div>

          {/* Impact Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span>قوة التأثير (Impact Power)</span>
              <span className="text-primary">{recommendation.impact}%</span>
            </div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden ring-1 ring-white/5 shadow-inner">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${recommendation.impact}%` }}
                transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
              />
            </div>
          </div>

          <Link href={recommendation.actionUrl} className="block mt-2">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
              <span>بدء التنفيذ</span>
              <ArrowRight className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default RecommendationCard;
