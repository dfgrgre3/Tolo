'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, Brain } from 'lucide-react';
import type { TimeStats } from '../types';

interface StudyAdvisorProps {
  stats: TimeStats;
}

const StudyAdvisor = ({ stats }: StudyAdvisorProps) => {
  const insights = useMemo(() => {
    const list = [];

    // Discipline Insights
    if (stats.disciplineScore > 80) {
      list.push({
        icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
        text: "انضباطك مذهل! استمر في هذا الأداء لتصل إلى رتبة 'أستاذ أعظم' قريباً.",
        type: 'success'
      });
    } else if (stats.disciplineScore < 40) {
      list.push({
        icon: <AlertTriangle className="h-4 w-4 text-rose-400" />,
        text: "انخفاض في معدل الانضباط. حاول الالتزام بمهام صغيرة يومياً لاستعادة قوتك.",
        type: 'warning'
      });
    }

    // Focus Insights
    if (stats.focusScore < 50) {
      list.push({
        icon: <Lightbulb className="h-4 w-4 text-amber-400" />,
        text: "تبدو مشتتاً بعض الشيء. جرب تقنية 'بومودورو' (25 دقيقة تركيز) لتحسين إنتاجيتك.",
        type: 'tip'
      });
    }

    // Goal Insights
    if (stats.dailyGoalProgress < 50) {
      list.push({
        icon: <Brain className="h-4 w-4 text-blue-400" />,
        text: "لم تقترب من هدفك اليومي بعد. هل جربت تقسيم المواد الصعبة إلى أجزاء أصغر؟",
        type: 'tip'
      });
    }

    // Mastery Insights
    if (stats.studyHours > 20 && stats.masteryScore < 60) {
      list.push({
        icon: <Sparkles className="h-4 w-4 text-purple-400" />,
        text: "تدرس لساعات طويلة لكن الإتقان ما زال منخفضاً. ركز على 'التعلم النشط' وحل المسائل.",
        type: 'info'
      });
    }

    // Default if empty
    if (list.length === 0) {
      list.push({
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        text: "أداء متوازن وممتاز. استمر في رحلتك التعليمية!",
        type: 'success'
      });
    }

    return list;
  }, [stats]);

  return (
    <Card className="bg-background/40 backdrop-blur-xl border-white/5 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Brain className="h-5 w-5 text-emerald-400" />
          المستشار الذكي
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="mt-1 flex-shrink-0">
                  {insight.icon}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {insight.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 text-center">
          <p className="text-xs text-emerald-400 font-bold mb-1">نصيحة اليوم</p>
          <p className="text-xs text-slate-400 italic">"العلم بالتعلم، والحلم بالتحلم.. ابدأ الآن ولو بخطوة بسيطة."</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyAdvisor;
