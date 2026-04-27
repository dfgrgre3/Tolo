import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Circle, BookOpen, MoreHorizontal, Calendar, MapPin, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getWeekDays, formatTimeRange } from './utils';
import { BLOCK_TYPES } from './constants';
import type { TimeBlock } from './types';
import { m } from "framer-motion";

interface AgendaViewProps {
  readonly currentWeek: Date;
  readonly timeBlocks: TimeBlock[];
  readonly onBlockEdit: (block: TimeBlock) => void;
  readonly onBlockComplete: (blockId: string) => void;
}

const getBlockTypeInfo = (type: string) => {
  return BLOCK_TYPES.find(t => t.value === type) || BLOCK_TYPES[0];
};

const getBlocksForDay = (blocks: TimeBlock[], day: number) => {
  return blocks
    .filter(block => block.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export function AgendaView({
  currentWeek,
  timeBlocks,
  onBlockEdit,
  onBlockComplete
}: AgendaViewProps) {
  const weekDays = getWeekDays(currentWeek);
  const DAYS_OF_WEEK = [
    'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  ];
  
  const getPriorityLabel = (priority: string | undefined): string => {
    if (priority === 'URGENT') return 'عاجل جداً';
    if (priority === 'HIGH') return 'مهم';
    if (priority === 'LOW') return 'بسيط';
    return '';
  };

  return (
    <div className="space-y-8">
      {weekDays.map((day, dayIndex) => {
        const dayBlocks = getBlocksForDay(timeBlocks, dayIndex);
        
        if (dayBlocks.length === 0) return null;
        
        const dayKey = format(day, 'yyyy-MM-dd');
        const isToday = dayKey === format(new Date(), 'yyyy-MM-dd');
        
        return (
          <m.div
            key={dayKey}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
          >
            <Card className={cn(
              "bg-background/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl",
              isToday && "ring-2 ring-emerald-500/50 bg-emerald-500/5"
            )}>
              <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl bg-blue-500/10 text-blue-400",
                      isToday && "bg-emerald-500/20 text-emerald-400"
                    )}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-black">{DAYS_OF_WEEK[dayIndex]}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">
                    {format(day, 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {dayBlocks.map((block, blockIndex) => {
                    const typeInfo = getBlockTypeInfo(block.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <m.div
                        key={block.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (dayIndex * 10 + blockIndex) * 0.05 }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 hover:scale-[1.01] transition-all duration-300 text-right group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                            block.isCompleted && "opacity-40 grayscale"
                          )}
                          onClick={() => onBlockEdit(block)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onBlockEdit(block);
                            }
                          }}
                        >
                          {/* Priority Indicator Line */}
                          <div className={cn(
                            "absolute inset-y-0 right-0 w-1.5",
                            block.priority === 'URGENT' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                            block.priority === 'HIGH' ? 'bg-orange-500' :
                            block.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-500'
                          )} />

                          <div 
                            className={cn("p-3 rounded-xl shadow-lg flex items-center justify-center")}
                            style={{ backgroundColor: block.color ? `${block.color}30` : '#3b82f630', color: block.color || '#3b82f6' }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className={cn(
                                "text-lg font-black text-slate-100",
                                block.isCompleted && "line-through text-slate-500"
                              )}>
                                {block.title}
                              </h4>
                              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {typeInfo.label}
                              </Badge>
                              {block.priority && block.priority !== 'MEDIUM' && (
                                <Badge 
                                  variant={block.priority === 'URGENT' ? 'destructive' : 'secondary'}
                                  className="text-[10px] font-black"
                                >
                                  {getPriorityLabel(block.priority)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                <Clock className="w-3 h-3 text-blue-400" />
                                {formatTimeRange(block.startTime, block.endTime)}
                              </span>
                              
                              {block.subject && (
                                <span className="flex items-center gap-1.5 text-emerald-400/80">
                                  <BookOpen className="w-3 h-3" />
                                  {block.subject}
                                </span>
                              )}
                              
                              {block.location && (
                                <span className="flex items-center gap-1.5 text-blue-400/70">
                                  <MapPin className="w-3 h-3" />
                                  {block.location}
                                </span>
                              )}
                            </div>
                            
                            {block.description && (
                              <div className="flex items-start gap-2 mt-2 text-slate-400 text-xs italic opacity-80">
                                <AlignLeft className="h-3 w-3 mt-0.5 shrink-0" />
                                <p className="line-clamp-1">{block.description}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "rounded-xl transition-all duration-300 h-10 w-10",
                                block.isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500 hover:text-emerald-400"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBlockComplete(block.id);
                              }}
                            >
                              {block.isCompleted ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </Button>
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-xl h-10 w-10 bg-white/5 text-slate-500 hover:text-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </m.div>
        );
      })}
    </div>
  );
}
