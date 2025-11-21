import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Circle, BookOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getWeekDays, formatTimeRange } from './utils';
import { BLOCK_TYPES } from './constants';
import type { TimeBlock } from './types';
import styles from './styles.module.css';

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

function MapPin({ className }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

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
    if (priority === 'URGENT') return 'عاجل';
    if (priority === 'HIGH') return 'مهم';
    if (priority === 'LOW') return 'منخفض';
    return '';
  };

  return (
    <div className="space-y-6">
      {weekDays.map((day, dayIndex) => {
        const dayBlocks = getBlocksForDay(timeBlocks, dayIndex);
        
        if (dayBlocks.length === 0) return null;
        
        const dayKey = format(day, 'yyyy-MM-dd');
        
        return (
          <Card key={dayKey}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{DAYS_OF_WEEK[dayIndex]}</span>
                <span className="text-sm text-gray-500">
                  {format(day, 'dd MMMM yyyy', { locale: ar })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dayBlocks.map(block => {
                  const typeInfo = getBlockTypeInfo(block.type);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all text-left",
                        block.isCompleted && "opacity-60"
                      )}
                      onClick={() => onBlockEdit(block)}
                    >
                      {/* CSS variables for dynamic values are acceptable */}
                      <div 
                        className={cn(styles.blockIcon, typeInfo.color, block.color && styles.blockIconWithColor)}
                        {...(block.color ? { 
                          style: { '--block-color': block.color } as React.CSSProperties & { '--block-color': string }
                        } : {})}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium",
                            block.isCompleted && "line-through"
                          )}>
                            {block.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                          {block.priority && block.priority !== 'MEDIUM' && (
                            <Badge 
                              variant={block.priority === 'URGENT' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {getPriorityLabel(block.priority)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeRange(block.startTime, block.endTime)}
                          </span>
                          
                          {block.subject && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {block.subject}
                            </span>
                          )}
                          
                          {block.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {block.location}
                            </span>
                          )}
                        </div>
                        
                        {block.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {block.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBlockComplete(block.id);
                          }}
                        >
                          {block.isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add more actions menu
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

