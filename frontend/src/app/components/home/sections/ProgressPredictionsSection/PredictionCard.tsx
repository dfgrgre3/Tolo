"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Clock, ArrowRight } from "lucide-react";

interface Prediction {
  period: string;
  predictedScore: number;
  confidence: number;
  milestones: Array<{
    date: string;
    goal: string;
    status: "upcoming" | "current" | "achieved";
  }>;
  recommendations: string[];
}

interface PredictionCardProps {
  prediction: Prediction;
  index: number;
}

export const PredictionCard = ({ prediction, index }: PredictionCardProps) => {
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return { label: "دقة فائقة", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    if (confidence >= 60) return { label: "دقة عالية", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    return { label: "توقع أولي", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
  };

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case "achieved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "current":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-white/5 text-gray-500 border-white/10";
    }
  };

  const conf = getConfidenceLevel(prediction.confidence);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="bg-white/5 border-white/5 shadow-xl hover:bg-white/[0.08] transition-all duration-500 border-none group">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-100 group-hover:text-primary transition-colors">
              <Calendar className="h-6 w-6 text-indigo-400" />
              <span>{prediction.period}</span>
            </CardTitle>
            <Badge className={`${conf.color} text-[10px] uppercase font-black tracking-widest`}>
              {conf.label}
            </Badge>
          </div>

          <div className="bg-black/40 rounded-3xl p-8 border border-white/5 shadow-inner relative overflow-hidden group/box">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                الدرجة القتالية المتوقعة
              </span>
              <Target className="h-5 w-5 text-primary animate-bounce-slow" />
            </div>
            <div className="relative z-10 flex items-baseline gap-3">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                {prediction.predictedScore}
              </span>
              <span className="text-xl font-bold text-gray-500">%</span>
            </div>
            <div className="mt-8 h-3 bg-black/60 rounded-full overflow-hidden ring-1 ring-white/5 p-[1px]">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${prediction.predictedScore}%` }}
                transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary via-indigo-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-8">
          <div>
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              خريطة الأهداف (Roadmap)
            </h4>
            <div className="space-y-3">
              {prediction.milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-200">
                        {milestone.goal}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-black px-2 py-0.5 border ${getMilestoneStatusBadge(milestone.status)}`}
                      >
                        {milestone.status === "achieved" && "مكتمل"}
                        {milestone.status === "current" && "قيد المواجهة"}
                        {milestone.status === "upcoming" && "هدف مستقبلي"}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {milestone.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black text-amber-400/80 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
              تكتيكات مقترحة (Tactics)
            </h4>
            <div className="grid gap-3">
              {prediction.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-amber-500/70 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-gray-300 leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default PredictionCard;
