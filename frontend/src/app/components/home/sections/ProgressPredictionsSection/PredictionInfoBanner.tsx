"use client";

import React from "react";
import { m } from "framer-motion";
import { Lightbulb } from "lucide-react";

export const PredictionInfoBanner = () => {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 }}
      className="mt-12"
    >
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-primary/10 via-indigo-600/20 to-primary/10 border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
          <div className="rounded-2xl bg-white/10 p-4 border border-white/20 shadow-xl backdrop-blur-md">
            <Lightbulb className="h-8 w-8 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">كيف يعمل محرك التنبؤ؟</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-4xl">
              نقوم بتحليل سجل تدريبك (دراستك)، وكثافة جلساتك، ونتائج معاركك (اختباراتك) عبر خوارزميات التعلم الآلي
              لنمنحك توقعات دقيقة تساعدك في رسم خطتك المستقبلية للسيطرة على موادك الدراسية.
            </p>
          </div>
        </div>
      </div>
    </m.div>
  );
};

export default PredictionInfoBanner;
