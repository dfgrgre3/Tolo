"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Globe, Users, BarChart3, Play } from 'lucide-react';
import { rpgCommonStyles, FEATURES_LIST } from "../constants";
import FeatureCard from "../FeatureCard";

export const FeaturesSection = memo(function FeaturesSection() {

  return (
    <section aria-labelledby="features-heading" className="max-w-7xl mx-auto px-4 !pt-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4 ring-1 ring-primary/20 backdrop-blur-sm">
          <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
            الترسانة
          </Badge>
          <span className="text-sm font-medium text-primary shadow-sm">أدواتك للنجاح</span>
        </div>
        <h2
          id="features-heading"
          className={`text-3xl md:text-4xl font-black mb-4 ${rpgCommonStyles.neonText} flex items-center justify-center gap-2`}
        >
          <span>قدرات النظام (System Features)</span>
          <span className="text-2xl animate-pulse" aria-hidden="true">💎</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          اكتشف الأدوات التي ستساعدك في رحلتك الملحمية نحو التفوق
        </p>
      </motion.div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FEATURES_LIST.map((feature, index) => (
          <FeatureCard 
            key={index} 
            delay={feature.delay} 
            icon={feature.icon} 
            title={feature.title} 
            description={feature.description} 
            badge={feature.badge} 
            color={feature.color} 
            link={feature.link} 
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-20"
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-indigo-900/80 to-purple-900/80 rounded-3xl shadow-2xl backdrop-blur-xl">
           <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 mix-blend-overlay"></div>
           <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/30 rounded-full blur-3xl"></div>
           
          <CardContent className="py-10 md:py-12 px-6 md:px-12 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="text-center lg:text-right max-w-2xl">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 flex items-center justify-center lg:justify-start gap-3">
                  <Crown className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                  <span>انضم للنخبة (Elite Squad)</span>
                </h3>
                <p className="text-indigo-100/80 mb-6 text-lg">
                  أكثر من 10,000 طالب يستخدمون منصتنا لتحسين قدراتهم القتالية (الأكاديمية) وتحقيق الانتصارات.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
                  <div className="flex items-center bg-black/30 border border-white/10 px-4 py-2 rounded-full text-sm text-gray-200 backdrop-blur-sm">
                    <Globe className="h-4 w-4 ml-2 text-blue-400" />
                    <span>سيرفرات محمية</span>
                  </div>
                  <div className="flex items-center bg-black/30 border border-white/10 px-4 py-2 rounded-full text-sm text-gray-200 backdrop-blur-sm">
                    <Users className="h-4 w-4 ml-2 text-green-400" />
                    <span>مجتمع نشط</span>
                  </div>
                  <div className="flex items-center bg-black/30 border border-white/10 px-4 py-2 rounded-full text-sm text-gray-200 backdrop-blur-sm">
                    <BarChart3 className="h-4 w-4 ml-2 text-purple-400" />
                    <span>تحديثات يومية</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
                <Link href="/demo" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full px-10 py-7 text-lg bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold shadow-[0_0_20px_rgba(245,158,11,0.4)] border-0">
                    <Play className="ml-2 h-5 w-5 fill-black" />
                    بدء المغامرة
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";
export default FeaturesSection;


