"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  unit: string;
  trend?: string;
  color: string;
}

export const StatCard = ({ icon, title, value, unit, trend, color }: StatCardProps) => (
  <motion.div 
    className="group relative flex flex-col items-center rounded-3xl border border-slate-100/80 bg-white/80 p-6 text-center shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-blue-200/60 hover:shadow-2xl"
    whileHover={{ y: -8, scale: 1.03 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
  >
    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
      {icon}
    </div>
    <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </span>
      <span className="text-base font-medium text-muted-foreground">{unit}</span>
    </div>
    {trend && (
      <div className="mt-3 flex items-center justify-center text-sm font-medium text-emerald-600">
        <TrendingUp className="mr-1 h-4 w-4" />
        <span>{trend}</span>
      </div>
    )}
  </motion.div>
);
