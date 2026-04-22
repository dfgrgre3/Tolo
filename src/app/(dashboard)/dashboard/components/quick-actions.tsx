"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, PenTool, MessageSquare, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: BookOpen, label: "درس جديد", color: "bg-blue-500" },
    { icon: PenTool, label: "بدء اختبار", color: "bg-amber-500" },
    { icon: MessageSquare, label: "اسأل العراف", color: "bg-purple-500" },
    { icon: Calendar, label: "الجدول", color: "bg-emerald-500" },
  ];

  return (
    <div className="fixed bottom-8 left-8 z-50 flex flex-col items-center gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-center gap-3 mb-2">
            {actions.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 20 }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                className="group relative"
              >
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl">
                  {action.label}
                </div>
                <Button 
                  size="icon" 
                  className={`h-12 w-12 rounded-2xl shadow-2xl ${action.color} hover:scale-110 active:scale-95 transition-all border-b-4 border-black/20`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`h-16 w-16 rounded-[2rem] shadow-[0_20px_50px_rgba(var(--primary),0.4)] transition-all duration-500 z-50 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-primary'} border-b-4 border-black/20`}
      >
        {isOpen ? <X className="w-8 h-8 text-white" /> : <Plus className="w-8 h-8 text-white" />}
      </Button>
    </div>
  );
}
