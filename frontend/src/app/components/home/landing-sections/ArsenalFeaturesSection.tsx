"use client";

import React from "react";
import { m } from "framer-motion";
import { FEATURES_LIST } from "../constants";

interface ArsenalFeaturesSectionProps {
  activeScaleUp: any;
  shouldReduceMotion: boolean;
  neonTextClass: string;
}

export function ArsenalFeaturesSection({ activeScaleUp, shouldReduceMotion, neonTextClass }: ArsenalFeaturesSectionProps) {
  return (
    <div className="space-y-16">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black">ترسانة <span className={neonTextClass}>البطل التعليمية</span></h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">كل ما تحتاجه للسيطرة في مكان واحد</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {FEATURES_LIST.map((feat, i) => (
          <m.div
            key={i}
            {...activeScaleUp}
            viewport={{ once: true, margin: "-50px" }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: feat.delay || 0 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-8 text-center group flex flex-col items-center gap-6 hover:bg-card/60 transition-all"
          >
            <div className={`p-5 rounded-2xl bg-white/5 border border-white/5 ${feat.color} group-hover:scale-110 transition-transform`}>
              {feat.icon}
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-lg">{feat.title}</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">{feat.description}</p>
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
}
