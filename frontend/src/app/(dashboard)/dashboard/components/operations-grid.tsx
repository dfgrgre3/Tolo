"use client";

import React from "react";
import { m } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckSquare, Calendar, Trophy } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickLinks = [
  {
    title: "خريطة التقدم",
    description: "راقب توسع نفوذك وإنجازاتك في عالمك الدراسي",
    href: "/progress",
    icon: BarChart3,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    delay: 0.1
  },
  {
    title: "سجل المهام (Quests)",
    description: "المهام اليومية، الأسبوعية، والمهمات الملحمية",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    delay: 0.2
  },
  {
    title: "جدول المعارك",
    description: "تنظيم وقت المذاكرة والتحضير للامتحانات القادمة",
    href: "/schedule",
    icon: Calendar,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    delay: 0.3
  },
  {
    title: "لوحة الشرف",
    description: "الألقاب، الأوسمة، وترتيبك بين المحاربين",
    href: "/achievements",
    icon: Trophy,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    delay: 0.4
  }
];

interface OperationsGridProps {
  cardStyle: string;
}

export function OperationsGrid({ cardStyle }: OperationsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
      {quickLinks.map((link) => {
        const Icon = link.icon;
        return (
          <m.div
            key={link.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: link.delay }}
            whileHover={{ scale: 1.02 }}
          >
            <Link href={link.href} className="block group h-full">
              <Card className={cardStyle + " border-white/5 hover:border-primary/30 p-8"}>
                <div className="flex items-start gap-6">
                  <div className={`p-5 rounded-2xl ${link.bgColor} ${link.color} group-hover:scale-110 group-hover:rotate-6 transition-all shadow-2xl border border-white/10`}>
                    <Icon className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{link.title}</CardTitle>
                    <CardDescription className="text-gray-400 text-base leading-relaxed">{link.description}</CardDescription>
                  </div>
                </div>
                <div className="mt-10 flex items-center justify-between">
                  <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden mr-6 shadow-inner border border-white/5">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.5, delay: 1 }}
                      className={`h-full bg-gradient-to-r ${link.color === 'text-blue-400' ? 'from-blue-600 to-blue-300' : link.color === 'text-amber-400' ? 'from-amber-600 to-amber-300' : link.color === 'text-emerald-400' ? 'from-emerald-600 to-emerald-300' : 'from-purple-600 to-purple-300'} shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="group-hover:bg-primary/20 group-hover:text-primary gap-2 font-black h-10 px-6 rounded-xl transition-all">
                    <span>دخول</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </Card>
            </Link>
          </m.div>
        );
      })}
    </div>
  );
}
