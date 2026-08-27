"use client";

import React from "react";
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

export const PredictionCard = ({ prediction, index: _index }: PredictionCardProps) => {
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return { label: "دقة فائقة", color: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    if (confidence >= 60) return { label: "دقة عالية", color: "bg-primary/10 text-primary-strong border-primary/20" };
    return { label: "توقع أولي", color: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case "achieved":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "current":
        return "bg-primary/10 text-primary-strong border-primary/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const conf = getConfidenceLevel(prediction.confidence);

  return (
    <div
      className="h-full"
    >
      <Card className="bg-card border-border shadow-sm hover:border-primary/30 group">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-primary-strong">
              <Calendar className="h-6 w-6 text-primary-strong" />
              <span>{prediction.period}</span>
            </CardTitle>
            <Badge className={`${conf.color} text-[10px] uppercase font-black tracking-widest`}>
              {conf.label}
            </Badge>
          </div>

          <div className="bg-muted rounded-2xl p-8 border border-border relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                الدرجة المتوقعة
              </span>
              <Target className="h-5 w-5 text-primary-strong" />
            </div>
            <div className="relative z-10 flex items-baseline gap-3">
              <span className="text-6xl font-black text-primary-strong">
                {prediction.predictedScore}
              </span>
              <span className="text-xl font-bold text-muted-foreground">%</span>
            </div>
            <div className="mt-8 h-3 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-8">
          <div>
            <h4 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              خريطة الأهداف
            </h4>
            <div className="space-y-3">
              {prediction.milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted border border-border hover:bg-muted/70"
                >
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">
                        {milestone.goal}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-black px-2 py-0.5 border ${getMilestoneStatusBadge(milestone.status)}`}
                      >
                        {milestone.status === "achieved" && "مكتمل"}
                        {milestone.status === "current" && "قيد التنفيذ"}
                        {milestone.status === "upcoming" && "هدف مستقبلي"}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {milestone.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black text-amber-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
              توصيات مقترحة
            </h4>
            <div className="grid gap-3">
              {prediction.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100"
                >
                  <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-foreground leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictionCard;
