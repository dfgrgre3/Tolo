'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'إنشاء مهمة جديدة بسرعة'
    },
    {
      id: 'new-reminder',
      label: 'تذكير جديد',
      icon: Bell,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      description: 'إضافة تذكير مهم'
    },
    {
      id: 'start-timer',
      label: 'بدء المؤقت',
      icon: Clock,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'بدء جلسة مذاكرة'
    },
    {
      id: 'view-schedule',
      label: 'عرض الجدول',
      icon: Calendar,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'التحقق من الجدول الأسبوعي'
    },
    {
      id: 'set-goal',
      label: 'تعيين هدف',
      icon: Target,
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'تعيين هدف يومي أو أسبوعي'
    },
    {
      id: 'view-analytics',
      label: 'تحليل الأداء',
      icon: TrendingUp,
      color: 'bg-pink-500 hover:bg-pink-600',
      description: 'مشاهدة تقارير الأداء'
    },
    {
      id: 'quick-study',
      label: 'جلسة سريعة',
      icon: Zap,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'بدء جلسة مذاكرة سريعة'
    },
    {
      id: 'view-history',
      label: 'سجل المذاكرة',
      icon: BookOpen,
      color: 'bg-teal-500 hover:bg-teal-600',
      description: 'مراجعة جلسات المذاكرة السابقة'
    }
  ];

  return (
    <Card className="border-2 border-primary/10 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <CardTitle className="flex items-center text-lg">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                onClick={() => onAction(action.id)}
                className={`${action.color} text-white flex flex-col items-center justify-center h-24 gap-2 transition-all hover:scale-105 hover:shadow-lg`}
                variant="default"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

