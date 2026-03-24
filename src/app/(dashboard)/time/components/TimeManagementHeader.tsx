'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Play, Pause, RefreshCw, Download, Settings, Calendar, TrendingUp, Target } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import CreateTaskDialog from './CreateTaskDialog';
import type { SubjectType, Task } from '../types';

interface QuickStats {
  todayTasks: number;
  overdueTasks: number;
  completedToday: number;
  studyHours: number;
}

interface TimeManagementHeaderProps {
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onExport?: () => void;
  quickStats?: QuickStats;
  subjects?: SubjectType[];
  userId?: string;
  onTaskCreate?: (task: Task) => void;
}

export default function TimeManagementHeader({
  isTimerRunning,
  onTimerToggle,
  onRefresh,
  isRefreshing: isRefreshingProp = false,
  onExport,
  quickStats,
  subjects = [],
  userId,
  onTaskCreate
}: TimeManagementHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const refreshing = isRefreshing || isRefreshingProp;

  const handleTaskCreate = (task: Task) => {
    if (onTaskCreate) {
      onTaskCreate(task);
    }
    setIsCreateTaskOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 rtl" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 shadow-md">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              لوحة تنظيم الوقت
            </h1>
            {quickStats && quickStats.overdueTasks > 0 &&
            <Badge variant="destructive" className="animate-pulse">
                {quickStats.overdueTasks} متأخرة
              </Badge>
            }
            {quickStats && quickStats.todayTasks > 0 &&
            <Badge variant="default" className="bg-blue-600">
                <Calendar className="h-3 w-3 ml-1" />
                {quickStats.todayTasks} اليوم
              </Badge>
            }
            {quickStats && quickStats.completedToday > 0 &&
            <Badge variant="secondary" className="bg-green-600">
                <Target className="h-3 w-3 ml-1" />
                {quickStats.completedToday} مكتملة
              </Badge>
            }
            {quickStats && quickStats.studyHours > 0 &&
            <Badge variant="outline">
                <TrendingUp className="h-3 w-3 ml-1" />
                {quickStats.studyHours.toFixed(1)} ساعات
              </Badge>
            }
          </div>
          <p className="text-muted-foreground">إدارة وقتك بفعالية وتحقيق أهدافك الأكاديمية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex items-center gap-2 transition-all hover:shadow-md hover:scale-105"
            onClick={() => setIsCreateTaskOpen(true)}
            disabled={!userId}>
            
            <PlusCircle className="h-4 w-4" />
            مهمة جديدة
          </Button>
          
          {userId && subjects.length > 0 && onTaskCreate &&
          <CreateTaskDialog
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            onTaskCreate={handleTaskCreate}
            subjects={subjects}
            userId={userId} />

          }
          
          <Button
            onClick={onTimerToggle}
            className={`flex items-center gap-2 transition-all hover:shadow-md hover:scale-105 ${
            isTimerRunning ?
            'bg-red-600 hover:bg-red-700' :
            'bg-green-600 hover:bg-green-700'}`
            }>
            
            {isTimerRunning ?
            <>
                <Pause className="h-4 w-4" />
                إيقاف المؤقت
              </> :

            <>
                <Play className="h-4 w-4" />
                بدء المؤقت
              </>
            }
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 transition-all hover:shadow-md">
            
            {refreshing ?
            <RefreshCw className="h-4 w-4 animate-spin" /> :

            <RefreshCw className="h-4 w-4" />
            }
            {refreshing ? 'جاري التحديث...' : 'تحديث'}
          </Button>
          
          {onExport &&
          <Button
            variant="outline"
            onClick={onExport}
            className="flex items-center gap-2 transition-all hover:shadow-md">
            
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          }
          
          <Button
            variant="outline"
            className="flex items-center gap-2 transition-all hover:shadow-md">
            
            <Settings className="h-4 w-4" />
            إعدادات
          </Button>
        </div>
      </div>
      
      {/* Productivity Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{quickStats?.todayTasks || 0}</div>
          <div className="text-xs text-muted-foreground">المهام اليوم</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{quickStats?.completedToday || 0}</div>
          <div className="text-xs text-muted-foreground">المكتملة</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{quickStats?.overdueTasks || 0}</div>
          <div className="text-xs text-muted-foreground">المتأخرة</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{quickStats?.studyHours?.toFixed(1) || '0.0'}</div>
          <div className="text-xs text-muted-foreground">ساعات الدراسة</div>
        </div>
      </div>
    </div>);

}