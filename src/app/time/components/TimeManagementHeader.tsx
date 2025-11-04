'use client';

import { Button } from "@/shared/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Play, Pause, RefreshCw } from 'lucide-react';

interface TimeManagementHeaderProps {
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  onRefresh: () => void;
}

export default function TimeManagementHeader({
  isTimerRunning,
  onTimerToggle,
  onRefresh
}: TimeManagementHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 shadow-md">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          لوحة تنظيم الوقت
        </h1>
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
          <DialogContent className="max-w-md">
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
        
        <Button 
          variant="outline" 
          onClick={onRefresh}
          className="flex items-center gap-2 transition-all hover:shadow-md hover:scale-105"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </div>
    </div>
  );
}

