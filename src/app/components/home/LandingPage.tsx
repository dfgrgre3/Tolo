"use client";

import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Crown,
  Shield,
  Sword,
  Zap,
  Target,

  Users,
  ArrowRight,

  ChevronDown,

  Map,
  Compass,
  Star } from

"lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  scrollVariants,

  HIGHLIGHT_CARDS,
  FEATURES_LIST } from
"./constants";

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden pb-40" dir="rtl">
      {/* --- Cinematic Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div style={{ y: y1 }} className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full opacity-30" />
        <motion.div style={{ y: y2 }} className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-purple-600/15 blur-[150px] rounded-full opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
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
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
         <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary mb-12 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
          
           <Shield className="h-5 w-5" />
           <span>TOLO: عصر جديد في التعلم</span>
         </motion.div>

         <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-9xl font-black tracking-tighter leading-[1.1] mb-8">
          
           حوّل دراستك <br /> إلى <span className={STYLES.neonText}>لحظات مجد</span> ًںڈ†
         </motion.h1>

         <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-gray-400 font-medium max-w-3xl mb-16 leading-relaxed">
          
           لا تكتفي بمذاكرة الدروس. انطلق في <span className={STYLES.goldText}>رحلة بطل</span>، اجمع نقاط القوة، ارفع مستواك الدراسي، وسيطر على لوحة الشرف الملكية.
         </motion.p>

         <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 items-center">
          
           <Link href="/register">
              <Button className="h-20 px-12 bg-primary text-black font-black rounded-[2rem] gap-4 shadow-2xl shadow-primary/30 hover:scale-105 transition-all text-xl group overflow-hidden relative">
                 <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                 <span>ابدأ مغامرتك الآن</span>
                 <Sword className="h-6 w-6 transition-transform group-hover:rotate-45" />
              </Button>
           </Link>
           <Link href="/courses">
              <Button variant="outline" className="h-20 px-12 rounded-[2rem] border-white/10 bg-white/5 text-xl font-bold hover:bg-white/10 transition-all font-black">
                 استكشاف المهام (المواد)
              </Button>
           </Link>
         </motion.div>

         <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-20 opacity-30">
          
            <ChevronDown className="h-10 w-10 text-primary" />
         </motion.div>
      </section>

      {/* --- THE REALM FEATURES --- */}
      <section className="max-w-7xl mx-auto px-4 py-32 space-y-32">
         {/* Feature Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HIGHLIGHT_CARDS.map((card, i) =>
          <motion.div
            key={i}
            {...scrollVariants.fadeUp}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-10 group hover:border-primary/50 transition-all cursor-default">
            
                 <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-10 transition-transform group-hover:scale-110 group-hover:rotate-6">
                    {card.icon}
                 </div>
                 <h3 className="text-2xl font-black mb-4">{card.title}</h3>
                 <p className="text-gray-400 font-medium leading-relaxed mb-10">{card.description}</p>
                 <Link href={card.href} className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs hover:gap-4 transition-all">
                    <span>{card.actionLabel}</span>
                    <ArrowRight className="h-4 w-4 rotate-180" />
                 </Link>
              </motion.div>
          )}
         </div>

         {/* Cinematic Middle Section */}
         <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-12 md:p-24 relative group overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
               <div className="space-y-8 flex-1">
                  <div className="inline-flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                     <Star className="h-3.5 w-3.5" />
                     <span>نظام الرتب الملكي</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black leading-tight">
                     من <span className="text-gray-500">مقاتل مبتدئ</span> <br /> إلى <span className={STYLES.goldText}>قائد جيش</span>
                  </h2>
                  <p className="text-xl text-gray-400 font-medium max-w-xl leading-relaxed">
                     كل دقيقة مذاكرة هي نقطة خبرة (XP). كل اختبار تجتازه يقربك من المركز الأول في لوحة الشرف الملكية في عالم TOLO.
                  </p>
                  <div className="flex flex-wrap gap-8 pt-6">
                     <div className="space-y-1">
                        <p className="text-3xl font-black text-white">50K+</p>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">مغامر نشط</p>
                     </div>
                     <div className="w-px h-12 bg-white/10 hidden sm:block" />
                     <div className="space-y-1">
                        <p className="text-3xl font-black text-white">1M+</p>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">تحدي مكتمل</p>
                     </div>
                     <div className="w-px h-12 bg-white/10 hidden sm:block" />
                     <div className="space-y-1">
                        <p className="text-3xl font-black text-white">4.9/5</p>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">تقييم الفرسان</p>
                     </div>
                  </div>
               </div>

               <div className="relative w-full max-w-md lg:max-w-lg aspect-square">
                  <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                  <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                className="absolute inset-0 border-[2px] border-dashed border-white/5 rounded-full" />
              
                  <div className="absolute inset-4 border border-white/10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl shadow-2xl">
                     <Crown className="w-32 h-32 text-primary shadow-[0_0_40px_rgba(var(--primary),0.5)]" />
                  </div>
                  
                  {/* Floating Icons around */}
                  {[Zap, Target, Shield, Users].map((Icon, idx) =>
              <motion.div
                key={idx}
                animate={{
                  y: [0, idx % 2 === 0 ? 30 : -30, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 8 + idx * 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl z-20"
                style={{
                  top: idx === 0 ? "10%" : idx === 1 ? "10%" : "auto",
                  bottom: idx === 2 ? "10%" : idx === 3 ? "10%" : "auto",
                  left: idx === 0 || idx === 2 ? "10%" : "auto",
                  right: idx === 1 || idx === 3 ? "10%" : "auto"
                }}>
                
                       <Icon className="w-8 h-8 text-white/40" />
                    </motion.div>
              )}
               </div>
            </div>
         </div>

         {/* All Arsenal Features */}
         <div className="space-y-16">
            <div className="text-center space-y-4">
               <h2 className="text-4xl font-black">ترسانة <span className={STYLES.neonText}>البطل التعليمية</span></h2>
               <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">كل ما تحتاجه للسيطرة في مكان واحد</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {FEATURES_LIST.map((feat, i) =>
            <motion.div
              key={i}
              {...scrollVariants.scaleUp}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: feat.delay || 0 }}
              className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-8 text-center group flex flex-col items-center gap-6 hover:bg-card/60 transition-all">
              
                    <div className={`p-5 rounded-2xl bg-white/5 border border-white/5 ${feat.color} group-hover:scale-110 transition-transform`}>
                       {feat.icon}
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-black text-lg">{feat.title}</h4>
                       <p className="text-xs text-gray-500 font-medium leading-relaxed">{feat.description}</p>
                    </div>
                 </motion.div>
            )}
            </div>
         </div>

         {/* Final Call to Action - The Coliseum */}
         <motion.div
          {...scrollVariants.fadeUp}
          viewport={{ once: true }}
          className="relative p-20 rounded-[4rem] bg-gradient-to-br from-primary/10 via-purple-600/5 to-transparent border border-white/10 overflow-hidden text-center group">
          
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[130px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            </div>
            
            <div className="relative z-10 space-y-10">
               <div className="mx-auto h-20 w-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
                  <Map className="w-10 h-10 text-primary" />
               </div>
               <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                  هل أنت مستعد <br /> لكتابة <span className={STYLES.neonText}>تاريخك؟</span>
               </h2>
               <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                  انضم لآلاف الطلاب الذين حوّلوا عامهم الدراسي إلى مغامرة ممتعة. المملكة تفتح أبوابها لك الآن.
               </p>
               <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link href="/register">
                    <Button className="h-20 px-16 bg-white text-black font-black rounded-[2rem] text-xl hover:scale-105 transition-all shadow-white/10 shadow-2xl">
                       انضم للجيش الآن (تسجيل مجاني)
                    </Button>
                  </Link>
               </div>
               <div className="flex items-center justify-center gap-4 text-xs font-black text-gray-600 uppercase tracking-widest pt-10">
                  <div className="flex items-center gap-2">
                     <Shield className="w-4 h-4" />
                     <span>حماية ملكية</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                     <Compass className="w-4 h-4" />
                     <span>توجيه عسكري</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4" />
                     <span>سرعة البرق</span>
                  </div>
               </div>
            </div>
         </motion.div>
      </section>

      {/* --- Simple Footer Info --- */}
      <div className="max-w-7xl mx-auto px-4 py-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
         <p className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">TOLO &copy; {new Date().getFullYear()} - THE REALM OF KNOWLEDGE</p>
         <div className="flex gap-8">
            <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">قوانين المملكة</Link>
            <Link href="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">ميثاق الخصوصية</Link>
         </div>
      </div>
    </div>);

}