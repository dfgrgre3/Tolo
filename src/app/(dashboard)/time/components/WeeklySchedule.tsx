'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { motion } from 'framer-motion';

import type { TimeBlock, WeeklyScheduleProps } from './WeeklySchedule/types';
import { calculateWeekStats, addMinutesToTime } from './WeeklySchedule/utils';
import { ScheduleHeader } from './WeeklySchedule/ScheduleHeader';
import { WeekNavigation } from './WeeklySchedule/WeekNavigation';
import { ScheduleFilters } from './WeeklySchedule/ScheduleFilters';
import { TimeGrid } from './WeeklySchedule/TimeGrid';
import { AgendaView } from './WeeklySchedule/AgendaView';
import { BlockFormDialog } from './WeeklySchedule/BlockFormDialog';
import { SettingsDialog } from './WeeklySchedule/SettingsDialog';

import { logger } from '@/lib/logger';

function extractTimeBlocks(planJson?: string): TimeBlock[] {
  if (!planJson) return [];

  try {
    const parsed = JSON.parse(planJson) as unknown;

    if (
      parsed &&
      typeof parsed === 'object' &&
      'timeBlocks' in parsed &&
      Array.isArray((parsed as { timeBlocks?: unknown }).timeBlocks)
    ) {
      return (parsed as { timeBlocks: TimeBlock[] }).timeBlocks;
    }

    if (Array.isArray(parsed)) {
      return parsed as TimeBlock[];
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>).flatMap(([dayKey, value]) => {
        if (!Array.isArray(value)) return [];

        const parsedDate = new Date(dayKey);
        if (Number.isNaN(parsedDate.getTime())) return [];

        return value.map((block, index) => {
          const legacyBlock = (block ?? {}) as Record<string, unknown>;
          return {
            id: typeof legacyBlock.id === 'string' ? legacyBlock.id : `legacy_${dayKey}_${index}`,
            title: typeof legacyBlock.title === 'string' ? legacyBlock.title : 'عنصر بدون عنوان',
            description: typeof legacyBlock.description === 'string' ? legacyBlock.description : '',
            startTime: typeof legacyBlock.startTime === 'string' ? legacyBlock.startTime : '09:00',
            endTime: typeof legacyBlock.endTime === 'string' ? legacyBlock.endTime : '10:00',
            day: parsedDate.getDay(),
            color: typeof legacyBlock.color === 'string' ? legacyBlock.color : '#3b82f6',
            type: typeof legacyBlock.type === 'string'
              ? legacyBlock.type.toUpperCase() as TimeBlock['type']
              : 'STUDY',
            subject: typeof legacyBlock.subject === 'string' ? legacyBlock.subject : '',
            priority: typeof legacyBlock.priority === 'string'
              ? legacyBlock.priority.toUpperCase() as TimeBlock['priority']
              : 'MEDIUM',
            isRecurring: Boolean(legacyBlock.isRecurring),
            recurringPattern: typeof legacyBlock.recurringPattern === 'string'
              ? legacyBlock.recurringPattern.toUpperCase() as TimeBlock['recurringPattern']
              : 'WEEKLY',
            reminders: Array.isArray(legacyBlock.reminders)
              ? legacyBlock.reminders.filter((reminder): reminder is number => typeof reminder === 'number')
              : [],
            location: typeof legacyBlock.location === 'string' ? legacyBlock.location : '',
            notes: typeof legacyBlock.notes === 'string' ? legacyBlock.notes : '',
            isCompleted: Boolean(legacyBlock.isCompleted),
            completedAt: typeof legacyBlock.completedAt === 'string' ? legacyBlock.completedAt : undefined
          };
        });
      });
    }

    return [];
  } catch (error) {
    logger.error('Error parsing schedule data:', error);
    return [];
  }
}

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
  const [, setSelectedSlot] = useState<{day: number;time: string;} | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'agenda'>('week');
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
  const [, setDraggedBlock] = useState<TimeBlock | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showTimeLabels, setShowTimeLabels] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(60); // minutes
  const [hasInitialized, setHasInitialized] = useState(false);

  // Statistics
  const [weekStats, setWeekStats] = useState(calculateWeekStats([], currentWeek));

  const loadScheduleData = useCallback(() => {
    setTimeBlocks(extractTimeBlocks(schedule?.planJson));
    setHasInitialized(true);
  }, [schedule]);

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

  const saveSchedule = useCallback(async () => {
    if (!userId) return;

    const scheduleData = {
      timeBlocks,
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    };

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          version: typeof (schedule as any)?.version === 'number'
            ? (schedule as any).version
            : undefined,
          plan: scheduleData
        })
      });

      if (response.ok) {
        const savedSchedule = await response.json();
        onScheduleUpdate?.(savedSchedule);
      }
    } catch (error) {
      logger.error('Error saving schedule:', error);
    }
  }, [timeBlocks, userId, schedule, onScheduleUpdate]);

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave || !hasInitialized) return;
    const timer = setTimeout(() => { saveSchedule(); }, 1000);
    return () => clearTimeout(timer);
  }, [timeBlocks, autoSave, hasInitialized, saveSchedule]);

  const handleSlotClick = useCallback((day: number, time: string) => {
    setSelectedSlot({ day, time });
    setFormData((prev) => ({
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
    if (formData.startTime >= formData.endTime) return;

    const newBlock: TimeBlock = {
      id: blockToEdit?.id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      isCompleted: blockToEdit?.isCompleted || false,
      completedAt: blockToEdit?.completedAt
    };

    if (blockToEdit) {
      setTimeBlocks((prev) => prev.map((block) => block.id === blockToEdit.id ? newBlock : block));
    } else {
      setTimeBlocks((prev) => [...prev, newBlock]);
    }

    setIsDialogOpen(false);
    setBlockToEdit(null);
    setSelectedSlot(null);
  }, [formData, blockToEdit]);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setBlockToEdit(null);
    setSelectedSlot(null);
  }, []);

  const handleBlockDelete = useCallback((blockId: string) => {
    if (!blockId) return;
    setTimeBlocks((prev) => prev.filter((block) => block.id !== blockId));
  }, []);

  const handleBlockComplete = useCallback((blockId: string) => {
    if (!blockId) return;
    setTimeBlocks((prev) => prev.map((block) =>
      block.id === blockId ? {
        ...block,
        isCompleted: !block.isCompleted,
        completedAt: !block.isCompleted ? new Date().toISOString() : undefined
      } : block
    ));
  }, []);

  // Memoize filtered blocks
  const filteredBlocks = useMemo(() => {
    return timeBlocks.filter((block) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!block.title?.toLowerCase().includes(query) && !block.description?.toLowerCase().includes(query)) return false;
      }
      if (filterType !== 'all' && block.type !== filterType) return false;
      if (!showCompleted && block.isCompleted) return false;
      return true;
    });
  }, [timeBlocks, searchQuery, filterType, showCompleted]);

  const exportSchedule = useCallback(() => {
    try {
      const data = { timeBlocks, weekStats, exportDate: new Date().toISOString(), version: '2.0' };
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
      logger.error('Error exporting schedule:', error);
    }
  }, [timeBlocks, weekStats, currentWeek]);

  const importSchedule = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data.timeBlocks)) setTimeBlocks(data.timeBlocks);
      } catch (error) {
        logger.error('Error importing schedule:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="space-y-6">
      <ScheduleHeader
        weekStats={weekStats}
        onSettingsClick={() => setShowSettings(true)}
        onExport={exportSchedule}
        onImport={importSchedule}
      />

      <WeekNavigation
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <ScheduleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        showCompleted={showCompleted}
        onShowCompletedToggle={() => setShowCompleted(!showCompleted)}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <Card className="bg-transparent border-0 shadow-none">
          <CardContent className="p-0">
            {viewMode === 'week' ? (
              <div className="relative rounded-3xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto pb-4">
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
              </div>
            ) : (
              <div className="bg-[#0A0F1D]/50 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl">
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
      </motion.div>

      <BlockFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        blockToEdit={blockToEdit}
        formData={formData}
        subjects={subjects}
        onFormDataChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
        onSubmit={handleFormSubmit}
        onDelete={blockToEdit ? () => {
          handleBlockDelete(blockToEdit.id);
          handleDialogClose();
        } : undefined}
      />

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
