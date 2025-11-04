import React from 'react';
import { cn } from '@/lib/utils';
import { TIME_SLOTS, DAYS_OF_WEEK } from './constants';
import { getWeekDays, parseTime, addMinutesToTime } from './utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { TimeBlock } from './types';
import { TimeBlockCard } from './TimeBlockCard';

interface TimeGridProps {
  currentWeek: Date;
  timeBlocks: TimeBlock[];
  showTimeLabels: boolean;
  compactView: boolean;
  onSlotClick: (day: number, time: string) => void;
  onBlockEdit: (block: TimeBlock) => void;
  onBlockComplete: (blockId: string) => void;
  onBlockDragStart: (block: TimeBlock) => void;
}

const getBlocksForTimeSlot = (blocks: TimeBlock[], day: number, time: string) => {
  return blocks.filter(block => {
    if (block.day !== day) return false;
    const blockStart = parseTime(block.startTime);
    const slotStart = parseTime(time);
    const slotEnd = parseTime(addMinutesToTime(time, 60));
    return blockStart >= slotStart && blockStart < slotEnd;
  });
};

export function TimeGrid({
  currentWeek,
  timeBlocks,
  showTimeLabels,
  compactView,
  onSlotClick,
  onBlockEdit,
  onBlockComplete,
  onBlockDragStart
}: TimeGridProps) {
  const weekDays = getWeekDays(currentWeek);
  
  return (
    <div className="grid grid-cols-8 gap-1 text-sm">
      {/* Time column header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-2 border-b">
        <span className="text-xs text-gray-500">الوقت</span>
      </div>
      
      {/* Day headers */}
      {weekDays.map((day, index) => (
        <div key={index} className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-2 border-b text-center">
          <div className="font-medium">{DAYS_OF_WEEK[index]}</div>
          <div className="text-xs text-gray-500">
            {format(day, 'dd/MM', { locale: ar })}
          </div>
        </div>
      ))}
      
      {/* Time slots */}
      {TIME_SLOTS.map((time, timeIndex) => (
        <React.Fragment key={time}>
          {/* Time label */}
          {showTimeLabels && (
            <div className="p-2 text-xs text-gray-500 border-r">
              {time}
            </div>
          )}
          
          {/* Day slots */}
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const dayBlocks = getBlocksForTimeSlot(timeBlocks, dayIndex, time);
            
            return (
              <div
                key={`${dayIndex}-${time}`}
                className={cn(
                  "min-h-[60px] border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 relative",
                  compactView && "min-h-[40px]"
                )}
                onClick={() => onSlotClick(dayIndex, time)}
              >
                {dayBlocks.map(block => (
                  <TimeBlockCard
                    key={block.id}
                    block={block}
                    compactView={compactView}
                    onEdit={onBlockEdit}
                    onComplete={onBlockComplete}
                    onDragStart={onBlockDragStart}
                  />
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

