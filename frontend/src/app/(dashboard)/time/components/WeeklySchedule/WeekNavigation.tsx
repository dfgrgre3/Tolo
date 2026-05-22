import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, ListTodo } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';
import { m } from "framer-motion";

interface WeekNavigationProps {
  currentWeek: Date;
  onWeekChange: (week: Date) => void;
  viewMode: 'week' | 'day' | 'agenda';
  onViewModeChange: (mode: 'week' | 'day' | 'agenda') => void;
}

export function WeekNavigation({ 
  currentWeek, 
  onWeekChange, 
  viewMode,
  onViewModeChange 
}: WeekNavigationProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-background/30 backdrop-blur-xl border border-white/5 rounded-3xl w-full">
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('week')}
          className={`flex-1 md:flex-none gap-2 px-6 rounded-xl transition-all duration-300 ${
            viewMode === 'week' 
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'hover:bg-white/10 text-muted-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span className="font-bold">أسبوع</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('agenda')}
          className={`flex-1 md:flex-none gap-2 px-6 rounded-xl transition-all duration-300 ${
            viewMode === 'agenda' 
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'hover:bg-white/10 text-muted-foreground'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          <span className="font-bold">جدول أعمال</span>
        </Button>
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(subWeeks(currentWeek, 1))}
          className="rounded-xl border-white/10 hover:bg-white/10 h-10 w-10"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onWeekChange(new Date())}
          className="rounded-xl border-white/10 hover:bg-white/10 px-6 font-bold h-10"
        >
          اليوم
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(addWeeks(currentWeek, 1))}
          className="rounded-xl border-white/10 hover:bg-white/10 h-10 w-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 text-center md:text-right px-4">
        <h3 className="text-lg font-black text-slate-100 flex items-center justify-center md:justify-end gap-2">
          <span className="text-emerald-400">{format(weekStart, 'dd MMMM', { locale: ar })}</span>
          <span className="opacity-40">-</span>
          <span className="text-blue-400">{format(weekEnd, 'dd MMMM yyyy', { locale: ar })}</span>
        </h3>
      </div>
    </div>
  );
}
