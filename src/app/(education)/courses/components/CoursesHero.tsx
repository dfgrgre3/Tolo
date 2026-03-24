"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Sparkles, Scroll, Sword, Shield } from "lucide-react";

interface CoursesHeroProps {
  totalCourses: number;
  totalStudents: number;
  totalInstructors: number;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export const CoursesHero: React.FC<CoursesHeroProps> = ({
  totalCourses,
  totalStudents,
  totalInstructors
}) => {
  const stats = [
  { icon: Scroll, value: totalCourses, label: "مخطوطة علمية", color: "text-blue-400", bgColor: "bg-blue-400/10" },
  { icon: Users, value: totalStudents, label: "محارب نشط", color: "text-purple-400", bgColor: "bg-purple-400/10" },
  { icon: Shield, value: totalInstructors, label: "معلم حكيم", color: "text-amber-400", bgColor: "bg-amber-400/10" }];


  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-background p-8 md:p-16 mb-12 shadow-2xl">
      {/* --- Ambient Background Effects --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full opacity-30 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full opacity-20 translate-y-1/2 -translate-x-1/2" />
        
        {/* Particle/Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-12">
        {/* Title Group */}
        <div className="space-y-6 max-w-3xl">
           <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-2 text-sm font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            
              <Sparkles className="h-5 w-5" />
              <span>أهلاً بك في الأرشيف الملكي</span>
           </motion.div>

           <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            
              مستودع <br />
              <span className={STYLES.neonText}>الحكمة والمهارات</span>
           </motion.h1>

           <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-400 font-medium max-w-2xl mx-auto">
            
              استعرض آلاف المخطوطات والدروس المصممة لترقية قدراتك القتالية في ساحات العلم. اختر طريقك وابدأ رحلتك الأسطورية اليوم.
           </motion.p>
        </div>

        {/* Thematic Stats Bar */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 w-full max-w-5xl">
           {stats.map((stat, index) =>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex-1 min-w-[200px]">
            
                <div className="relative group">
                   <div className="absolute inset-0 bg-white/[0.02] border border-white/5 rounded-3xl group-hover:bg-white/[0.05] group-hover:border-white/10 transition-all duration-300" />
                   <div className="relative p-8 flex flex-col items-center gap-4">
                      <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform shadow-lg`}>
                         <stat.icon className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                         <div className="text-3xl md:text-4xl font-black text-white">{stat.value.toLocaleString()}<span className="text-primary text-xl ml-1">+</span></div>
                         <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
                      </div>
                   </div>
                </div>
             </motion.div>
          )}
        </div>

        {/* Decorative Divider */}
        <div className="w-full max-w-xs flex items-center gap-4 opacity-20">
           <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white" />
           <Sword className="w-4 h-4 text-white rotate-45" />
           <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white" />
        </div>
      </div>
    </section>);

};

export default CoursesHero;