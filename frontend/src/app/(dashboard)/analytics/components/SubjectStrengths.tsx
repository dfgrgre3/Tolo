'use client';

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, TrendingUp, AlertTriangle } from "lucide-react";
import { buildSubjectInsights } from "@/features/analytics/lib/performance-calculations";
import type {
  PerformanceRaw,
  WeeklyData,
} from "@/features/analytics/lib/types";

interface Props {
  weekly: WeeklyData | null;
  performance: PerformanceRaw | null;
}

export default function SubjectStrengths({ weekly, performance }: Props) {
  const insights = useMemo(
    () => buildSubjectInsights(weekly, performance),
    [weekly, performance],
  );

  if (!insights.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات كافية لتحليل المواد</p>
            <p className="text-sm mt-2">سجّل وقت مذاكرة لكل مادة لعرض نقاط القوة والضعف</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const strengths = insights.filter((i) => i.strength);
  const weaknesses = insights.filter((i) => i.weakness);

  return (
    <div className="space-y-6">
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <TrendingUp className="h-5 w-5" /> نقاط القوة ({strengths.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strengths.length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد نقاط قوة واضحة بعد — واصل التقدم.</p>
              )}
              {strengths.map((s) => (
                <div key={s.subject} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-green-700 dark:text-green-300 font-bold">{s.masteryEstimate}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-5 w-5" /> تحتاج تركيز ({weaknesses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weaknesses.length === 0 && (
                <p className="text-sm text-muted-foreground">ممتاز — لا توجد مواد ضعيفة حالياً.</p>
              )}
              {weaknesses.map((w) => (
                <div key={w.subject} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{w.subject}</span>
                  <span className="text-orange-700 dark:text-orange-300 font-bold">{w.masteryEstimate}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            إتقان المواد
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {insights.map((i) => (
            <div key={i.subject} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{i.subject}</span>
                <span className="text-muted-foreground">
                  {(i.minutes / 60).toFixed(1)} س · {i.sharePct}%
                  {i.quizScore !== null ? ` · اختبار ${i.quizScore}%` : ""}
                </span>
              </div>
              <Progress value={i.masteryEstimate} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
