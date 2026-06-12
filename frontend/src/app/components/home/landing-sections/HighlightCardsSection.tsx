"use client";

import React from "react";
import { m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { HIGHLIGHT_CARDS } from "../constants";

interface HighlightCardsSectionProps {
  activeFadeUp: any;
  shouldReduceMotion: boolean;
}

export function HighlightCardsSection({ activeFadeUp, shouldReduceMotion }: HighlightCardsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {HIGHLIGHT_CARDS.map((card, i) => (
        <m.div
          key={i}
          {...activeFadeUp}
          viewport={{ once: true, margin: "-100px" }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: i * 0.1 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-10 group hover:border-primary/50 transition-all cursor-default"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-10 transition-transform group-hover:scale-110 group-hover:rotate-6">
            {card.icon}
          </div>
          <h3 className="text-2xl font-black mb-4">{card.title}</h3>
          <p className="text-gray-400 font-medium leading-relaxed mb-10">{card.description}</p>
          <Link href={card.href} className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs hover:gap-4 transition-all">
            <span>{card.actionLabel}</span>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Link>
        </m.div>
      ))}
    </div>
  );
}
