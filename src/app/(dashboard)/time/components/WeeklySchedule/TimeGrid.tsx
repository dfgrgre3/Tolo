import React from 'react';
import { cn } from '@/lib/utils';
import { TIME_SLOTS, DAYS_OF_WEEK } from './constants';
import { getWeekDays, parseTime, addMinutesToTime } from './utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { TimeBlock } from './types';
import { TimeBlockCard } from './TimeBlockCard';
import { motion } from 'framer-motion';

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
  return blocks.filter((block) => {
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
    <div className="w-full bg-[#0A0F1D]/50 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <div className="grid grid-cols-8 min-w-[800px] text-sm">
        {/* Time column header */}
        <div className="sticky top-0 bg-[#0F172A]/80 backdrop-blur-md z-30 p-4 border-b border-white/5 flex items-center justify-center">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">الوقت</span>
        </div>
        
        {/* Day headers */}
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={cn(
              "sticky top-0 bg-[#0F172A]/80 backdrop-blur-md z-30 p-4 border-b border-white/5 text-center transition-colors duration-300",
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-emerald-500/10"
            )}
          >
            <div className={cn(
              "font-black text-slate-300",
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "text-emerald-400"
            )}>
              {DAYS_OF_WEEK[index]}
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-1">
              {format(day, 'dd MMMM', { locale: ar })}
            </div>
          </div>
        ))}
        
        {/* Time slots */}
        {TIME_SLOTS.map((time, timeIndex) => (
          <React.Fragment key={time}>
            {/* Time label */}
            {showTimeLabels && (
              <div className="p-4 text-[11px] font-black text-slate-500 border-r border-white/5 bg-[#0F172A]/20 flex items-center justify-center">
                {time}
              </div>
            )}
            
            {/* Day slots */}
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayBlocks = getBlocksForTimeSlot(timeBlocks, dayIndex, time);

              return (
                <motion.div
                  key={`${dayIndex}-${time}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (timeIndex * 7 + dayIndex) * 0.005 }}
                  className={cn(
                    "min-h-[80px] border-b border-r border-white/5 cursor-pointer hover:bg-white/[0.02] relative group transition-colors duration-200",
                    compactView && "min-h-[50px]",
                    dayIndex === 6 && "border-r-0"
                  )}
                  onClick={() => onSlotClick(dayIndex, time)}
                >
                  {/* Subtle Grid Pattern / Hover Effect */}
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/[0.03] transition-colors pointer-events-none" />
                  
                  {dayBlocks.map((block) => (
                    <TimeBlockCard
                      key={block.id}
                      block={block}
                      compactView={compactView}
                      onEdit={onBlockEdit}
                      onComplete={onBlockComplete}
                      onDragStart={onBlockDragStart}
                    />
                  ))}
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
