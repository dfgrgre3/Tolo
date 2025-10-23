'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/shared/badge";
import { 
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  Coffee,
  Brain,
  Users,
  Home,
  Dumbbell,
  Music,
  Gamepad2,
  ShoppingCart,
  Car,
  Plane,
  Heart,
  Star,
  Target,
  Zap,
  Moon,
  Sun,
  Timer,
  Bell,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, formatISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Schedule {
  id: string;
  userId: string;
  planJson: string;
  createdAt: string;
  updatedAt: string;
}

interface TimeBlock {
  id: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  day: number;       // 0-6 (Sunday-Saturday)
  color: string;
  type: 'STUDY' | 'BREAK' | 'TASK' | 'MEETING' | 'PERSONAL' | 'EXERCISE' | 'MEAL' | 'SLEEP' | 'ENTERTAINMENT' | 'WORK';
  subject?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRecurring?: boolean;
  recurringPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  reminders?: number[]; // minutes before event
  location?: string;
  notes?: string;
  isCompleted?: boolean;
  completedAt?: string;
}

interface WeeklyScheduleProps {
  schedule: Schedule | null;
  subjects: string[];
  userId: string;
  onScheduleUpdate?: (schedule: Schedule) => void;
}

const DAYS_OF_WEEK = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

const BLOCK_TYPES = [
  { value: 'STUDY', label: 'دراسة', icon: BookOpen, color: 'bg-blue-500' },
  { value: 'BREAK', label: 'استراحة', icon: Coffee, color: 'bg-green-500' },
  { value: 'TASK', label: 'مهمة', icon: Target, color: 'bg-purple-500' },
  { value: 'MEETING', label: 'اجتماع', icon: Users, color: 'bg-orange-500' },
  { value: 'PERSONAL', label: 'شخصي', icon: Heart, color: 'bg-pink-500' },
  { value: 'EXERCISE', label: 'رياضة', icon: Dumbbell, color: 'bg-red-500' },
  { value: 'MEAL', label: 'وجبة', icon: ShoppingCart, color: 'bg-yellow-500' },
  { value: 'SLEEP', label: 'نوم', icon: Moon, color: 'bg-indigo-500' },
  { value: 'ENTERTAINMENT', label: 'ترفيه', icon: Gamepad2, color: 'bg-teal-500' },
  { value: 'WORK', label: 'عمل', icon: Zap, color: 'bg-gray-500' }
];

const PRIORITY_COLORS = {
  'LOW': 'border-l-green-400',
  'MEDIUM': 'border-l-yellow-400', 
  'HIGH': 'border-l-orange-400',
  'URGENT': 'border-l-red-400'
};

export default function WeeklySchedule({ 
  schedule, 
  subjects, 
  userId, 
  onScheduleUpdate 
}: WeeklyScheduleProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<TimeBlock | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'agenda'>('week');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showCompleted, setShowCompleted] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    day: 0,
    color: '#3b82f6',
    type: 'STUDY' as TimeBlock['type'],
    subject: '',
    priority: 'MEDIUM' as TimeBlock['priority'],
    isRecurring: false,
    recurringPattern: 'WEEKLY' as TimeBlock['recurringPattern'],
    reminders: [] as number[],
    location: '',
    notes: ''
  });
  
  // Advanced features
  const [draggedBlock, setDraggedBlock] = useState<TimeBlock | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showTimeLabels, setShowTimeLabels] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(60); // minutes
  
  // Statistics
  const [weekStats, setWeekStats] = useState({
    totalBlocks: 0,
    studyHours: 0,
    breakHours: 0,
    completedBlocks: 0,
    upcomingBlocks: 0,
    mostBusyDay: '',
    averageBlockDuration: 0
  });

  useEffect(() => {
    loadScheduleData();
  }, [schedule]);

  useEffect(() => {
    calculateWeekStats();
  }, [timeBlocks, currentWeek]);

  useEffect(() => {
    if (autoSave) {
      const timer = setTimeout(() => {
        saveSchedule();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeBlocks, autoSave]);

  const loadScheduleData = () => {
    if (schedule?.planJson) {
      try {
        const data = JSON.parse(schedule.planJson);
        setTimeBlocks(data.timeBlocks || []);
      } catch (error) {
        console.error('Error parsing schedule data:', error);
        setTimeBlocks([]);
      }
    }
  };

  const saveSchedule = async () => {
    const scheduleData = {
      timeBlocks,
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    };

    try {
      const endpoint = schedule ? `/api/schedule/${schedule.id}` : '/api/schedule';
      const method = schedule ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planJson: JSON.stringify(scheduleData)
        })
      });

      if (!response.ok) throw new Error('Failed to save schedule');
      
      const savedSchedule = await response.json();
      if (onScheduleUpdate) onScheduleUpdate(savedSchedule);
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const calculateWeekStats = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    
    const weekBlocks = timeBlocks.filter(block => {
      const blockDate = addDays(weekStart, block.day);
      return blockDate >= weekStart && blockDate <= weekEnd;
    });
    
    const totalBlocks = weekBlocks.length;
    const studyBlocks = weekBlocks.filter(b => b.type === 'STUDY');
    const breakBlocks = weekBlocks.filter(b => b.type === 'BREAK');
    const completedBlocks = weekBlocks.filter(b => b.isCompleted).length;
    const upcomingBlocks = weekBlocks.filter(b => !b.isCompleted).length;
    
    const studyHours = studyBlocks.reduce((acc, block) => {
      const start = parseTime(block.startTime);
      const end = parseTime(block.endTime);
      return acc + (end - start) / (1000 * 60 * 60);
    }, 0);
    
    const breakHours = breakBlocks.reduce((acc, block) => {
      const start = parseTime(block.startTime);
      const end = parseTime(block.endTime);
      return acc + (end - start) / (1000 * 60 * 60);
    }, 0);
    
    // Find most busy day
    const dayBlockCounts = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      count: weekBlocks.filter(b => b.day === i).length
    }));
    const mostBusyDay = dayBlockCounts.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    
    // Calculate average block duration
    const totalDuration = weekBlocks.reduce((acc, block) => {
      const start = parseTime(block.startTime);
      const end = parseTime(block.endTime);
      return acc + (end - start) / (1000 * 60);
    }, 0);
    const averageBlockDuration = totalBlocks > 0 ? totalDuration / totalBlocks : 0;
    
    setWeekStats({
      totalBlocks,
      studyHours: Math.round(studyHours * 10) / 10,
      breakHours: Math.round(breakHours * 10) / 10,
      completedBlocks,
      upcomingBlocks,
      mostBusyDay: DAYS_OF_WEEK[mostBusyDay.day],
      averageBlockDuration: Math.round(averageBlockDuration)
    });
  };

  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    return `${startTime} - ${endTime}`;
  };

  const getBlockDuration = (startTime: string, endTime: string): number => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
  };

  const handleSlotClick = (day: number, time: string) => {
    setSelectedSlot({ day, time });
    setFormData(prev => ({
      ...prev,
      day,
      startTime: time,
      endTime: addMinutesToTime(time, defaultDuration)
    }));
    setBlockToEdit(null);
    setIsDialogOpen(true);
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const handleBlockEdit = (block: TimeBlock) => {
    setBlockToEdit(block);
    setFormData({
      title: block.title,
      description: block.description || '',
      startTime: block.startTime,
      endTime: block.endTime,
      day: block.day,
      color: block.color,
      type: block.type,
      subject: block.subject || '',
      priority: block.priority || 'MEDIUM',
      isRecurring: block.isRecurring || false,
      recurringPattern: block.recurringPattern || 'WEEKLY',
      reminders: block.reminders || [],
      location: block.location || '',
      notes: block.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newBlock: TimeBlock = {
      id: blockToEdit?.id || `block_${Math.floor(Math.random() * 1000000)}`,
      ...formData,
      isCompleted: blockToEdit?.isCompleted || false,
      completedAt: blockToEdit?.completedAt
    };

    if (blockToEdit) {
      setTimeBlocks(prev => prev.map(block => 
        block.id === blockToEdit.id ? newBlock : block
      ));
    } else {
      setTimeBlocks(prev => [...prev, newBlock]);
    }

    handleDialogClose();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setBlockToEdit(null);
    setSelectedSlot(null);
    setFormData({
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      day: 0,
      color: '#3b82f6',
      type: 'STUDY',
      subject: '',
      priority: 'MEDIUM',
      isRecurring: false,
      recurringPattern: 'WEEKLY',
      reminders: [],
      location: '',
      notes: ''
    });
  };

  const handleBlockDelete = (blockId: string) => {
    setTimeBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  const handleBlockComplete = (blockId: string) => {
    setTimeBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { 
            ...block, 
            isCompleted: !block.isCompleted,
            completedAt: !block.isCompleted ? new Date().toISOString() : undefined
          }
        : block
    ));
  };

  const duplicateBlock = (block: TimeBlock) => {
    const newBlock: TimeBlock = {
      ...block,
      id: `block_${Math.floor(Math.random() * 1000000)}`,
      title: `${block.title} (نسخة)`,
      isCompleted: false,
      completedAt: undefined
    };
    setTimeBlocks(prev => [...prev, newBlock]);
  };

  const getFilteredBlocks = () => {
    return timeBlocks.filter(block => {
      // Search filter
      if (searchQuery && !block.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !block.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (filterType !== 'all' && block.type !== filterType) {
        return false;
      }
      
      // Completed filter
      if (!showCompleted && block.isCompleted) {
        return false;
      }
      
      return true;
    });
  };

  const exportSchedule = () => {
    const data = {
      timeBlocks,
      weekStats,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${format(currentWeek, 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSchedule = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.timeBlocks) {
          setTimeBlocks(data.timeBlocks);
        }
      } catch (error) {
        console.error('Error importing schedule:', error);
      }
    };
    reader.readAsText(file);
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getBlocksForDay = (day: number) => {
    return getFilteredBlocks()
      .filter(block => block.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getBlockTypeInfo = (type: string) => {
    return BLOCK_TYPES.find(t => t.value === type) || BLOCK_TYPES[0];
  };

  const renderTimeGrid = () => {
    const weekDays = getWeekDays();
    
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
              const dayBlocks = getBlocksForDay(dayIndex).filter(block => {
                const blockStart = parseTime(block.startTime);
                const slotStart = parseTime(time);
                const slotEnd = parseTime(addMinutesToTime(time, 60));
                
                return blockStart >= slotStart && blockStart < slotEnd;
              });
              
              return (
                <div
                  key={`${dayIndex}-${time}`}
                  className={cn(
                    "min-h-[60px] border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 relative",
                    compactView && "min-h-[40px]"
                  )}
                  onClick={() => handleSlotClick(dayIndex, time)}
                >
                  {dayBlocks.map(block => {
                    const typeInfo = getBlockTypeInfo(block.type);
                    const duration = getBlockDuration(block.startTime, block.endTime);
                    
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "absolute inset-1 rounded p-1 text-xs cursor-pointer border-l-4 transition-all hover:shadow-md",
                          typeInfo.color,
                          "text-white",
                          PRIORITY_COLORS[block.priority || 'MEDIUM'],
                          block.isCompleted && "opacity-60 line-through"
                        )}
                        style={{ 
                          backgroundColor: block.color,
                          height: `${Math.max(duration / 60 * 60, 20)}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockEdit(block);
                        }}
                        draggable
                        onDragStart={() => setDraggedBlock(block)}
                      >
                        <div className="font-medium truncate">{block.title}</div>
                        {!compactView && (
                          <>
                            <div className="text-xs opacity-90">
                              {formatTimeRange(block.startTime, block.endTime)}
                            </div>
                            {block.subject && (
                              <div className="text-xs opacity-80 truncate">
                                {block.subject}
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Block actions */}
                        <div className="absolute top-1 left-1 opacity-0 hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBlockComplete(block.id);
                              }}
                              className="w-4 h-4 bg-white/20 rounded hover:bg-white/40"
                            >
                              {block.isCompleted ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <Circle className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderAgendaView = () => {
    const weekDays = getWeekDays();
    
    return (
      <div className="space-y-6">
        {weekDays.map((day, dayIndex) => {
          const dayBlocks = getBlocksForDay(dayIndex);
          
          if (dayBlocks.length === 0) return null;
          
          return (
            <Card key={dayIndex}>
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
                      <div
                        key={block.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all",
                          block.isCompleted && "opacity-60"
                        )}
                        onClick={() => handleBlockEdit(block)}
                      >
                        <div 
                          className={cn("p-2 rounded", typeInfo.color)}
                          style={{ backgroundColor: block.color }}
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
                                {block.priority === 'URGENT' ? 'عاجل' : 
                                 block.priority === 'HIGH' ? 'مهم' : 'منخفض'}
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
                              handleBlockComplete(block.id);
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">الجدول الأسبوعي المتطور</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>المجموع: {weekStats.totalBlocks}</span>
            <span className="text-blue-600">دراسة: {weekStats.studyHours}س</span>
            <span className="text-green-600">استراحة: {weekStats.breakHours}س</span>
            <span className="text-purple-600">مكتمل: {weekStats.completedBlocks}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* View Mode Buttons */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              أسبوع
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
            >
              جدول أعمال
            </Button>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
            >
              اليوم
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportSchedule}
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="sr-only">استيراد</span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={importSchedule}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Week Display */}
      <div className="text-center">
        <h3 className="text-lg font-medium">
          {format(startOfWeek(currentWeek, { weekStartsOn: 0 }), 'dd MMMM', { locale: ar })} - {' '}
          {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 0 }), 6), 'dd MMMM yyyy', { locale: ar })}
        </h3>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="البحث في الأحداث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {BLOCK_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule View */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'week' ? (
            <div className="overflow-x-auto">
              {renderTimeGrid()}
            </div>
          ) : (
            <div className="p-6">
              {renderAgendaView()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Block Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {blockToEdit ? 'تعديل الحدث' : 'حدث جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">العنوان *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="عنوان الحدث"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">النوع</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف تفصيلي للحدث"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اليوم</label>
                <Select 
                  value={formData.day.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, day: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">وقت البداية</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">وقت النهاية</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.type === 'STUDY' && (
                <div>
                  <label className="block text-sm font-medium mb-1">المادة</label>
                  <Select 
                    value={formData.subject} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">الأولوية</label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">منخفضة</SelectItem>
                    <SelectItem value="MEDIUM">متوسطة</SelectItem>
                    <SelectItem value="HIGH">مهمة</SelectItem>
                    <SelectItem value="URGENT">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الموقع</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="موقع الحدث"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">اللون</label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية"
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
                <span className="text-sm">حدث متكرر</span>
              </label>
              
              {formData.isRecurring && (
                <Select 
                  value={formData.recurringPattern} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, recurringPattern: value }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">يومي</SelectItem>
                    <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                    <SelectItem value="MONTHLY">شهري</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                إلغاء
              </Button>
              {blockToEdit && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => {
                    handleBlockDelete(blockToEdit.id);
                    handleDialogClose();
                  }}
                >
                  حذف
                </Button>
              )}
              <Button type="submit">
                {blockToEdit ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعدادات الجدول</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>الحفظ التلقائي</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSave(!autoSave)}
              >
                {autoSave ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span>العرض المضغوط</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompactView(!compactView)}
              >
                {compactView ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span>إظهار تسميات الوقت</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimeLabels(!showTimeLabels)}
              >
                {showTimeLabels ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </Button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">المدة الافتراضية (دقيقة)</label>
              <Input
                type="number"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 60)}
                min="15"
                max="480"
              />
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setShowSettings(false)}>
                حفظ وإغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add missing components
function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
    </svg>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}