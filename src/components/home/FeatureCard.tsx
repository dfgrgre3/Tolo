"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  delay: number;
}

export const FeatureCard = ({ icon, title, description, link, delay }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -10, scale: 1.02 }}
    className="group relative flex h-full flex-col rounded-3xl border border-slate-100/80 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-blue-200/60 hover:shadow-2xl"
  >
    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative z-10 flex h-full flex-col">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-300">{title}</h3>
      <p className="mb-6 flex-grow text-muted-foreground leading-relaxed">{description}</p>
      <Link href={link} className="group/link inline-flex items-center text-blue-600 font-medium transition-all duration-300 hover:text-blue-700 hover:gap-2">
        <span>تعرف على المزيد</span>
        <ArrowRight className="mr-2 h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
      </Link>
    </div>
  </motion.div>
);
