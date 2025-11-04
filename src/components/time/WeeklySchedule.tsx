'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/shared/card";
import { Button } from "@/shared/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Settings, Download, Upload, ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle, Circle } from 'lucide-react';
import type { Schedule, TimeBlock, WeeklyScheduleProps } from './WeeklySchedule/types';
import { calculateWeekStats, addMinutesToTime } from './WeeklySchedule/utils';
import { ScheduleHeader } from './WeeklySchedule/ScheduleHeader';
import { WeekNavigation } from './WeeklySchedule/WeekNavigation';
import { ScheduleFilters } from './WeeklySchedule/ScheduleFilters';
import { TimeGrid } from './WeeklySchedule/TimeGrid';
import { AgendaView } from './WeeklySchedule/AgendaView';
import { BlockFormDialog } from './WeeklySchedule/BlockFormDialog';
import { SettingsDialog } from './WeeklySchedule/SettingsDialog';

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
  const [weekStats, setWeekStats] = useState(calculateWeekStats([], currentWeek));

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Memoize week stats calculation
  const weekStatsMemo = useMemo(() => {
    return calculateWeekStats(timeBlocks, currentWeek);
  }, [timeBlocks, currentWeek]);

  useEffect(() => {
    setWeekStats(weekStatsMemo);
  }, [weekStatsMemo]);

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave) return;
    
    const timer = setTimeout(() => {
      saveSchedule();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeBlocks, autoSave, saveSchedule]);

  const loadScheduleData = useCallback(() => {
    if (!schedule?.planJson) {
      setTimeBlocks([]);
      return;
    }

    try {
      const data = JSON.parse(schedule.planJson);
      setTimeBlocks(Array.isArray(data.timeBlocks) ? data.timeBlocks : []);
    } catch (error) {
      console.error('Error parsing schedule data:', error);
      setTimeBlocks([]);
    }
  }, [schedule]);

  const saveSchedule = useCallback(async () => {
    if (!userId) {
      console.warn('Cannot save schedule: userId is missing');
      return;
    }

    const scheduleData = {
      timeBlocks,
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    };

    try {
      const endpoint = schedule?.id ? `/api/schedule/${schedule.id}` : '/api/schedule';
      const method = schedule?.id ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planJson: JSON.stringify(scheduleData)
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to save schedule: ${errorText}`);
      }
      
      const savedSchedule = await response.json();
      onScheduleUpdate?.(savedSchedule);
    } catch (error) {
      console.error('Error saving schedule:', error);
      // You can add toast notification here if needed
    }
  }, [timeBlocks, userId, schedule, onScheduleUpdate]);


  const handleSlotClick = useCallback((day: number, time: string) => {
    setSelectedSlot({ day, time });
    setFormData(prev => ({
      ...prev,
      day,
      startTime: time,
      endTime: addMinutesToTime(time, defaultDuration)
    }));
    setBlockToEdit(null);
    setIsDialogOpen(true);
  }, [defaultDuration]);

  const handleBlockEdit = useCallback((block: TimeBlock) => {
    if (!block) return;
    
    setBlockToEdit(block);
    setFormData({
      title: block.title || '',
      description: block.description || '',
      startTime: block.startTime || '09:00',
      endTime: block.endTime || '10:00',
      day: block.day ?? 0,
      color: block.color || '#3b82f6',
      type: block.type || 'STUDY',
      subject: block.subject || '',
      priority: block.priority || 'MEDIUM',
      isRecurring: block.isRecurring || false,
      recurringPattern: block.recurringPattern || 'WEEKLY',
      reminders: block.reminders || [],
      location: block.location || '',
      notes: block.notes || ''
    });
    setIsDialogOpen(true);
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time range
    if (formData.startTime >= formData.endTime) {
      console.error('Start time must be before end time');
      return;
    }

    const newBlock: TimeBlock = {
      id: blockToEdit?.id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
  }, [formData, blockToEdit, handleDialogClose]);

  const handleDialogClose = useCallback(() => {
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
  }, []);

  const handleBlockDelete = useCallback((blockId: string) => {
    if (!blockId) return;
    setTimeBlocks(prev => prev.filter(block => block.id !== blockId));
  }, []);

  const handleBlockComplete = useCallback((blockId: string) => {
    if (!blockId) return;
    setTimeBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { 
            ...block, 
            isCompleted: !block.isCompleted,
            completedAt: !block.isCompleted ? new Date().toISOString() : undefined
          }
        : block
    ));
  }, []);

  const duplicateBlock = useCallback((block: TimeBlock) => {
    if (!block) return;
    const newBlock: TimeBlock = {
      ...block,
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${block.title} (نسخة)`,
      isCompleted: false,
      completedAt: undefined
    };
    setTimeBlocks(prev => [...prev, newBlock]);
  }, []);

  // Memoize filtered blocks
  const filteredBlocks = useMemo(() => {
    return timeBlocks.filter(block => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = block.title?.toLowerCase().includes(query);
        const descMatch = block.description?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) {
          return false;
        }
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
  }, [timeBlocks, searchQuery, filterType, showCompleted]);

  const exportSchedule = useCallback(() => {
    try {
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting schedule:', error);
    }
  }, [timeBlocks, weekStats, currentWeek]);

  const importSchedule = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data.timeBlocks)) {
          setTimeBlocks(data.timeBlocks);
        } else {
          console.error('Invalid schedule format');
        }
      } catch (error) {
        console.error('Error importing schedule:', error);
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
    };
    reader.readAsText(file);
  }, []);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <ScheduleHeader
          weekStats={weekStats}
          onSettingsClick={() => setShowSettings(true)}
          onExport={exportSchedule}
          onImport={importSchedule}
        />
        
        <div className="flex flex-wrap gap-2">
          <WeekNavigation
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Filters */}
      <ScheduleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        showCompleted={showCompleted}
        onShowCompletedToggle={() => setShowCompleted(!showCompleted)}
      />

      {/* Schedule View */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'week' ? (
            <div className="overflow-x-auto">
              <TimeGrid
                currentWeek={currentWeek}
                timeBlocks={filteredBlocks}
                showTimeLabels={showTimeLabels}
                compactView={compactView}
                onSlotClick={handleSlotClick}
                onBlockEdit={handleBlockEdit}
                onBlockComplete={handleBlockComplete}
                onBlockDragStart={setDraggedBlock}
              />
            </div>
          ) : (
            <div className="p-6">
              <AgendaView
                currentWeek={currentWeek}
                timeBlocks={filteredBlocks}
                onBlockEdit={handleBlockEdit}
                onBlockComplete={handleBlockComplete}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Block Dialog */}
      <BlockFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        blockToEdit={blockToEdit}
        formData={formData}
        subjects={subjects}
        onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
        onSubmit={handleFormSubmit}
        onDelete={blockToEdit ? () => {
          handleBlockDelete(blockToEdit.id);
          handleDialogClose();
        } : undefined}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onOpenChange={setShowSettings}
        autoSave={autoSave}
        onAutoSaveToggle={() => setAutoSave(!autoSave)}
        compactView={compactView}
        onCompactViewToggle={() => setCompactView(!compactView)}
        showTimeLabels={showTimeLabels}
        onShowTimeLabelsToggle={() => setShowTimeLabels(!showTimeLabels)}
        defaultDuration={defaultDuration}
        onDefaultDurationChange={setDefaultDuration}
      />
    </div>
  );
}
