'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Play, Pause, RefreshCw, Download, Settings, Calendar, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface QuickStats {
  todayTasks: number;
  overdueTasks: number;
}

interface TimeManagementHeaderProps {
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onExport?: () => void;
  quickStats?: QuickStats;
}

export default function TimeManagementHeader({
  isTimerRunning,
  onTimerToggle,
  onRefresh,
  isRefreshing: isRefreshingProp = false,
  onExport,
  quickStats
}: TimeManagementHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const refreshing = isRefreshing || isRefreshingProp;

  return (
    <div className="flex flex-col gap-4 rtl" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 shadow-md">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              لوحة تنظيم الوقت
            </h1>
            {quickStats && quickStats.overdueTasks > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {quickStats.overdueTasks} متأخرة
              </Badge>
            )}
            {quickStats && quickStats.todayTasks > 0 && (
              <Badge variant="default" className="bg-blue-600">
                <Calendar className="h-3 w-3 ml-1" />
                {quickStats.todayTasks} اليوم
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">إدارة وقتك بفعالية وتحقيق أهدافك الأكاديمية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 transition-all hover:shadow-md hover:scale-105">
                <PlusCircle className="h-4 w-4" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rtl" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-muted-foreground">
                <p>نموذج إنشاء المهام متوفر في علامة التبويب "إدارة المهام"</p>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={onTimerToggle} 
            className={`flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-105 ${
              isTimerRunning 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-4 w-4" />
                إيقاف المؤقت
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                بدء المؤقت
              </>
            )}
          </Button>
          
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              className="flex items-center gap-2 transition-all hover:shadow-md hover:scale-105"
              title="تصدير البيانات (Ctrl+E)"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 transition-all hover:shadow-md hover:scale-105 disabled:opacity-50"
            title="تحديث البيانات (Ctrl+R)"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </div>
      
      {/* Quick Stats Bar */}
      {quickStats && (quickStats.todayTasks > 0 || quickStats.overdueTasks > 0) && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">نظرة سريعة:</span>
          </div>
          {quickStats.todayTasks > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {quickStats.todayTasks} مهمة اليوم
            </Badge>
          )}
          {quickStats.overdueTasks > 0 && (
            <Badge variant="destructive" className="gap-1">
              {quickStats.overdueTasks} مهمة متأخرة
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

