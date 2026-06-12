"use client";

import React, { useEffect, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { scrollVariants } from "./constants";
import { useEfficiencyMode } from "@/hooks/use-efficiency-mode";

// Section imports
import { HeroSection } from "./landing-sections/HeroSection";
import { HighlightCardsSection } from "./landing-sections/HighlightCardsSection";
import { RoyalRankSection } from "./landing-sections/RoyalRankSection";
import { ArsenalFeaturesSection } from "./landing-sections/ArsenalFeaturesSection";
import { CallToActionSection } from "./landing-sections/CallToActionSection";
import { LandingFooter } from "./landing-sections/LandingFooter";

const STYLES = {
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

function useReducedMotion() {
  const [shouldReduce, setShouldReduce] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduce(mql.matches);

    const handler = () => setShouldReduce(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return shouldReduce;
}

export default function LandingPage() {
  const isEfficiencyMode = useEfficiencyMode();
  const shouldReduceMotion = useReducedMotion() || isEfficiencyMode;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeFadeUp = shouldReduceMotion ? {} : scrollVariants.fadeUp;
  const activeScaleUp = shouldReduceMotion ? {} : scrollVariants.scaleUp;

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden pb-40" dir="rtl">
        {/* --- Static Background --- */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 rounded-full opacity-20" />
          <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full opacity-10" />
        </div>

        {/* --- Navigation / Quick Link --- */}
        <div className="absolute top-10 left-10 z-50">
          <Link href="/login">
            <Button variant="ghost" className="rounded-full border border-white/10 px-8 hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
              المغامرين: تسجيل الدخول <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            </Button>
          </Link>
        </div>

        {/* --- HERO SECTION --- */}
        <HeroSection
          shouldReduceMotion={shouldReduceMotion}
          neonTextClass={STYLES.neonText}
          goldTextClass={STYLES.goldText}
        />

        {/* --- THE REALM FEATURES --- */}
        <section className="max-w-7xl mx-auto px-4 py-32 space-y-32">
          {/* Feature Grid */}
          <HighlightCardsSection
            activeFadeUp={activeFadeUp}
            shouldReduceMotion={shouldReduceMotion}
          />

          {/* Cinematic Middle Section */}
          <RoyalRankSection
            mounted={mounted}
            shouldReduceMotion={shouldReduceMotion}
            goldTextClass={STYLES.goldText}
          />

          {/* All Arsenal Features */}
          <ArsenalFeaturesSection
            activeScaleUp={activeScaleUp}
            shouldReduceMotion={shouldReduceMotion}
            neonTextClass={STYLES.neonText}
          />

          {/* Final Call to Action */}
          <CallToActionSection
            activeFadeUp={activeFadeUp}
            neonTextClass={STYLES.neonText}
          />
        </section>

        {/* --- Simple Footer Info --- */}
        <LandingFooter />
      </div>
    </LazyMotion>
  );
}