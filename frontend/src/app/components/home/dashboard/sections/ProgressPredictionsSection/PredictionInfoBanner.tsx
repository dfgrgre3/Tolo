"use client";

import React from "react";
import { Lightbulb } from "lucide-react";

export const PredictionInfoBanner = () => {
  return (
    <div
      className="mt-12"
    >
      <div className="relative overflow-hidden rounded-2xl p-8 bg-primary/5 border border-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
          <div className="rounded-2xl bg-card p-4 border border-border shadow-sm">
            <Lightbulb className="h-8 w-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-foreground mb-2 tracking-tight">كيف يعمل محرك التنبؤ؟</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-4xl">
              نقوم بتحليل سجل مذاكرتك، وكثافة جلساتك، ونتائج امتحاناتك عبر خوارزميات التعلم الآلي
              لنمنحك توقعات دقيقة تساعدك في رسم خطتك المستقبلية للسيطرة على موادك الدراسية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionInfoBanner;
