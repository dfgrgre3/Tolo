"use client";

import * as React from "react";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Split, BarChart3, TrendingUp, Activity, Users, Target } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Experiment } from "@/types/ab-testing";

interface ABTestingOverviewProps {
  experiments: Experiment[];
}

export const ABTestingOverview: React.FC<ABTestingOverviewProps> = ({ experiments }) => {
  const activeExperiments = experiments.filter(exp => exp.status === 'active');
  const completedExperiments = experiments.filter(exp => exp.status === 'completed');
  const totalParticipants = experiments.reduce((sum, exp) => sum + exp.sampleSize, 0);
  
  // Find the most successful experiment (highest completion rate)
  const bestExperiment = experiments.reduce((best, current) => {
    const currentMaxRate = Math.max(current.variantA.completionRate, current.variantB.completionRate);
    const bestMaxRate = best ? Math.max(best.variantA.completionRate, best.variantB.completionRate) : 0;
    
    return currentMaxRate > bestMaxRate ? current : best;
  }, null as Experiment | null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AdminCard variant="glass" className="p-6 border-teal-500/20 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-500">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black">اختبارات النمو A/B</h3>
              <p className="text-sm text-muted-foreground">تحليل وتحسين تجربة المستخدم</p>
            </div>
          </div>
          <Link href="/admin/ab-testing">
            <AdminButton size="sm" variant="outline" className="gap-2">
              عرض الكل
            </AdminButton>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-muted-foreground">نشطة</span>
            </div>
            <p className="text-2xl font-black text-blue-500">{activeExperiments.length}</p>
          </div>
          
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-muted-foreground">منتهية</span>
            </div>
            <p className="text-2xl font-black text-emerald-500">{completedExperiments.length}</p>
          </div>
          
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-muted-foreground">مشاركون</span>
            </div>
            <p className="text-2xl font-black text-purple-500">{totalParticipants.toLocaleString()}</p>
          </div>
          
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-muted-foreground">متوسط النمو</span>
            </div>
            <p className="text-2xl font-black text-orange-500">+28%</p>
          </div>
        </div>

        {bestExperiment && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">أفضل تجربة</h4>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{bestExperiment.title}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">النسخة أ:</span>
                    <span className="ml-2 font-bold text-emerald-500">{bestExperiment.variantA.completionRate}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">النسخة ب:</span>
                    <span className="ml-2 font-bold text-emerald-500">{bestExperiment.variantB.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Link href="/admin/ab-testing">
          <AdminButton className="w-full mt-6 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 font-bold">
            إنشاء تجربة A/B جديدة
          </AdminButton>
        </Link>
      </AdminCard>
    </motion.div>
  );
};
