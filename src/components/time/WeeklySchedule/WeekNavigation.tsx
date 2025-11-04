import { Button } from "@/shared/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';

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
  return (
    <>
      <div className="flex rounded-lg border">
        <Button
          variant={viewMode === 'week' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('week')}
        >
          أسبوع
        </Button>
        <Button
          variant={viewMode === 'agenda' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('agenda')}
        >
          جدول أعمال
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(subWeeks(currentWeek, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(new Date())}
        >
          اليوم
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(addWeeks(currentWeek, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium">
          {format(startOfWeek(currentWeek, { weekStartsOn: 0 }), 'dd MMMM', { locale: ar })} - {' '}
          {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 0 }), 6), 'dd MMMM yyyy', { locale: ar })}
        </h3>
      </div>
    </>
  );
}

