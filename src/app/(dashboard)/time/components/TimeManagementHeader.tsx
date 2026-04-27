'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Play, Pause, RefreshCw, Download, Settings, Calendar, TrendingUp, Target, Clock, Zap, Award } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";

import CreateTaskDialog from './CreateTaskDialog';
import type { SubjectType, Task, TimeStats } from '../types';
import { calculateGameMetrics } from '../utils/gameUtils';

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
  fullStats?: TimeStats; // Need full stats for XP
  subjects?: SubjectType[];
  userId?: string;
  onTaskCreate?: (task: Task) => void;
  isCreateTaskOpen?: boolean;
  setIsCreateTaskOpen?: (open: boolean) => void;
}

export default function TimeManagementHeader({
  isTimerRunning,
  onTimerToggle,
  onRefresh,
  isRefreshing: isRefreshingProp = false,
  onExport,
  quickStats,
  fullStats, // Optional for backward compatibility, but we expect it for XP System
  subjects = [],
  userId,
  onTaskCreate,
  isCreateTaskOpen: isCreateTaskOpenProp,
  setIsCreateTaskOpen: setIsCreateTaskOpenProp
}: TimeManagementHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalIsCreateTaskOpen, setInternalIsCreateTaskOpen] = useState(false);

  const isCreateTaskOpen = isCreateTaskOpenProp ?? internalIsCreateTaskOpen;
  const setIsCreateTaskOpen = setIsCreateTaskOpenProp ?? setInternalIsCreateTaskOpen;

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

  // Calculate XP only if fullStats exists
  const gameMetrics = fullStats ? calculateGameMetrics(fullStats) : null;

  return (
    <div className="flex flex-col gap-6 rtl relative z-10" dir="rtl">
      {/* HUD Profile / Command Center Header */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-6 sm:p-8 rounded-3xl bg-background/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] supports-[backdrop-filter]:bg-background/40">
        
        {/* Fantasy/Cyberpunk Glowing Orbs Background inside header */}
        <div className="absolute top-[-50px] right-[-50px] w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-50px] left-[-50px] w-72 h-72 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
        
        <div className="space-y-4 flex-1 relative z-10 w-full lg:w-auto">
          <div className="flex items-start lg:items-center gap-4 flex-col lg:flex-row">
            {/* Player Level Badge */}
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="relative shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-2 border-emerald-300/50">
              
              <div className="text-center">
                <div className="text-xs font-bold text-emerald-100/90 tracking-wider">Lvl</div>
                <div className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-md">
                   {gameMetrics?.level || 1}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-400 p-1.5 rounded-full shadow-lg border-2 border-white/20">
                <Award className="h-4 w-4 text-amber-900" />
              </div>
            </m.div>

            {/* Title & Rank Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent drop-shadow-sm">
                  تنظيم الوقت
                </h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] px-3 py-1 text-sm font-bold flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-emerald-500" />
                  {gameMetrics?.rank || "قيادة الأداء"}
                </Badge>
              </div>

              {/* XP Progress Bar */}
              {gameMetrics &&
              <div className="w-full max-w-md mt-2 space-y-2">
                   <div className="flex justify-between text-xs font-medium text-muted-foreground/80">
                     <span>{gameMetrics.currentXP} XP</span>
                     <span>التالي: {gameMetrics.xpForNextLevel} XP</span>
                   </div>
                   <div className="relative h-2.5 w-full bg-muted/50 rounded-full overflow-hidden border border-white/5">
                     <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gameMetrics.progressPercentage}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full">
                    
                       <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-stripe" />
                     </m.div>
                   </div>
                </div>
              }
            </div>
          </div>
        </div>
        
        {/* Action Buttons Panel */}
        <div className="flex flex-wrap gap-3 lg:gap-4 items-center relative z-10 w-full lg:w-auto">
          <Button
            className="flex-1 lg:flex-none items-center justify-center gap-2 h-12 px-6 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95 text-base font-semibold"
            onClick={() => setIsCreateTaskOpen(true)}
            disabled={!userId}>
            
            <PlusCircle className="h-5 w-5" />
            إضافة مهمة
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
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 text-base font-semibold ${
            isTimerRunning ?
            'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
            'bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`
            }>
            
            {isTimerRunning ?
            <>
                <Pause className="h-5 w-5 fill-current" />
                <span>إيقاف المؤقت</span>
              </> :
            <>
                <Play className="h-5 w-5 fill-current" />
                <span>بدء التركيز</span>
              </>
            }
          </Button>
          
          <div className="flex gap-2 w-full lg:w-auto justify-end mt-2 lg:mt-0">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-12 h-12 rounded-xl bg-background/50 hover:bg-muted/80 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 border-white/10"
              title="تحديث البيانات">
            
              {refreshing ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : <RefreshCw className="h-5 w-5 text-muted-foreground" />}
            </Button>
            
            {onExport &&
            <Button
              variant="outline"
              size="icon"
              onClick={onExport}
              className="w-12 h-12 rounded-xl bg-background/50 hover:bg-muted/80 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 border-white/10"
              title="تصدير">
              
                <Download className="h-5 w-5 text-muted-foreground" />
              </Button>
            }
            
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-xl bg-background/50 hover:bg-muted/80 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 border-white/10"
              title="إعدادات">
              
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Productivity Indicator Stats - RPG Floating Look */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <m.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-background/40 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-lg flex items-center justify-between group">
          
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
          <div className="relative z-10">
            <div className="text-4xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">{quickStats?.todayTasks || 0}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">مهام اليوم</div>
          </div>
          <div className="relative z-10 p-4 bg-primary/10 rounded-2xl border border-primary/20 rotate-3 group-hover:-rotate-3 transition-transform">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
        </m.div>

        {/* Card 2 */}
        <m.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-background/40 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-lg flex items-center justify-between group">
          
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="relative z-10">
            <div className="text-4xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{quickStats?.completedToday || 0}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">المكتملة اليوم</div>
          </div>
          <div className="relative z-10 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 rotate-3 group-hover:-rotate-3 transition-transform">
            <Target className="h-6 w-6 text-emerald-500" />
          </div>
        </m.div>

        {/* Card 3 */}
        <m.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-background/40 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-lg flex items-center justify-between group">
          
          <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
          <div className="relative z-10">
            <div className="text-4xl font-black text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">{quickStats?.overdueTasks || 0}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">مهام متأخرة</div>
          </div>
          <div className="relative z-10 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 -rotate-3 group-hover:rotate-3 transition-transform">
            <Clock className="h-6 w-6 text-rose-500" />
          </div>
        </m.div>

        {/* Card 4 */}
        <m.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-background/40 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-lg flex items-center justify-between group">
          
          <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="relative z-10">
            <div className="text-4xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">{quickStats?.studyHours?.toFixed(1) || '0.0'}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">ساعات الأسبوع</div>
          </div>
          <div className="relative z-10 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 -rotate-3 group-hover:rotate-3 transition-transform">
            <TrendingUp className="h-6 w-6 text-amber-500" />
          </div>
        </m.div>
      </div>
    </div>);

}