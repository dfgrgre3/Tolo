'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  PlusCircle, 
  Clock, 
  Calendar, 
  Bell, 
  Target, 
  TrendingUp,
  Zap,
  BookOpen
} from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'new-task',
      label: 'مهمة جديدة',
      icon: PlusCircle,
      color: 'bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]',
      description: 'إنشاء مهمة جديدة بسرعة'
    },
    {
      id: 'new-reminder',
      label: 'تذكير جديد',
      icon: Bell,
      color: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]',
      description: 'إضافة تذكير مهم'
    },
    {
      id: 'start-timer',
      label: 'بدء المؤقت',
      icon: Clock,
      color: 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]',
      description: 'بدء جلسة مذاكرة'
    },
    {
      id: 'view-schedule',
      label: 'عرض الجدول',
      icon: Calendar,
      color: 'bg-purple-500/10 text-purple-500 border border-purple-500/30 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      description: 'التحقق من الجدول الأسبوعي'
    },
    {
      id: 'set-goal',
      label: 'تعيين هدف',
      icon: Target,
      color: 'bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]',
      description: 'تعيين هدف يومي أو أسبوعي'
    },
    {
      id: 'view-analytics',
      label: 'تحليل الأداء',
      icon: TrendingUp,
      color: 'bg-pink-500/10 text-pink-500 border border-pink-500/30 hover:bg-pink-500/20 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]',
      description: 'مشاهدة تقارير الأداء'
    },
    {
      id: 'quick-study',
      label: 'جلسة سريعة',
      icon: Zap,
      color: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 hover:bg-indigo-500/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]',
      description: 'بدء جلسة مذاكرة سريعة'
    },
    {
      id: 'view-history',
      label: 'سجل المذاكرة',
      icon: BookOpen,
      color: 'bg-teal-500/10 text-teal-500 border border-teal-500/30 hover:bg-teal-500/20 hover:shadow-[0_0_15px_rgba(20,184,166,0.4)]',
      description: 'مراجعة جلسات المذاكرة السابقة'
    }
  ];

  return (
    <Card className="border-white/10 shadow-xl bg-background/60 backdrop-blur-xl group relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 relative z-10 border-b border-primary/10">
        <CardTitle className="flex items-center text-lg">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => onAction(action.id)}
                  className={`w-full flex flex-col items-center justify-center h-24 gap-3 transition-all rounded-xl ${action.color}`}
                  variant="outline"
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-bold text-center leading-tight">{action.label}</span>
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}

