"use client";

import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, Award, Sparkles } from "lucide-react";

interface CoursesHeroProps {
  totalCourses: number;
  totalStudents: number;
  totalInstructors: number;
}

export const CoursesHero: React.FC<CoursesHeroProps> = ({
  totalCourses,
  totalStudents,
  totalInstructors
}) => {
  const stats = [
    { icon: BookOpen, value: totalCourses, label: "دورة تعليمية", color: "from-blue-500 to-cyan-500" },
    { icon: Users, value: totalStudents, label: "طالب مسجل", color: "from-purple-500 to-pink-500" },
    { icon: Award, value: totalInstructors, label: "مدرب متميز", color: "from-amber-500 to-orange-500" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-8 md:p-12 mb-8">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Floating elements */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              y: [-20, -100],
              x: Math.sin(i) * 50
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              delay: i * 2
            }}
            className="absolute bottom-0"
            style={{ left: `${15 + i * 15}%` }}
          >
            <Sparkles className="h-4 w-4 text-white/40" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Text content */}
          <div className="text-center md:text-right">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center md:justify-start gap-3 mb-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                الدورات التعليمية
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-blue-100/80 max-w-xl"
            >
              اكتشف مجموعة متنوعة من الدورات التعليمية المصممة لتعزيز مهاراتك الأكاديمية
              ومساعدتك على تحقيق أهدافك التعليمية
            </motion.p>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4 md:gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md" />
                <div className="relative p-4 md:p-6 text-center">
                  <div className={`mx-auto mb-2 h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.value.toLocaleString()}+
                  </div>
                  <div className="text-xs md:text-sm text-blue-100/70">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CoursesHero;
