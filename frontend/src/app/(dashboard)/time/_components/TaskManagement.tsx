'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  BarChart3,
  X,
  CheckCircle,
  BookOpen,
} from 'lucide-react';
import { isPast } from 'date-fns';

import { logger } from '@/lib/logger';
import { ApiContractError } from '@/lib/api/api-client';
import {
  createTaskRaw,
  deleteTaskRaw,
  patchTaskRaw,
} from '@/features/tasks/api/tasks-gateway';
import { TaskFormDialog } from './_components/TaskFormDialog';
import { TaskFilters } from './_components/TaskFilters';
import { TaskStatsPanel } from './_components/TaskStatsPanel';
import { BulkActionsBar } from './_components/BulkActionsBar';
import { TaskListItem } from './_components/TaskListItem';
import { VirtualList } from "@/components/ui/virtual-list";
import type { Task, SubTask, TaskManagementProps } from './_components/task-types';
import { taskSchema } from './_components/task-types';
import {
  matchesTaskFilters,
  getTaskSortComparison,
  buildTaskPayload,
  mergeServerTask,
} from './_components/task-utils';
import { toast } from 'sonner';

export default function TaskManagement({
  initialTasks,
  subjects,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete
}: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'created' | 'priority' | 'title' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCompleted] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: 'MATH',
      dueAt: '',
      priority: 'MEDIUM',
      estimatedTime: 30,
      tags: ''
    }
  });

  useEffect(() => {
    queueMicrotask(() => {
      setTasks(initialTasks);
    });
  }, [initialTasks]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const getAllTags = useMemo(() => {
    const allTags = tasks.flatMap(task => task.tags || []);
    return [...new Set(allTags)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task =>
      matchesTaskFilters(task, searchQuery, filter, selectedSubject, selectedPriority, selectedTags, showCompleted)
    );

    filtered.sort((a, b) => {
      const comparison = getTaskSortComparison(a, b, sortBy);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, searchQuery, filter, selectedSubject, selectedPriority, selectedTags, showCompleted, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter(t => t.dueAt && isPast(new Date(t.dueAt)) && t.status !== 'COMPLETED').length;

    const totalEstimatedTime = tasks.reduce((acc, task) => acc + (task.estimatedTime || 0), 0);
    const totalActualTime = tasks.reduce((acc, task) => acc + (task.actualTime || 0), 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      inProgress,
      overdue,
      totalEstimatedTime,
      totalActualTime,
      completionRate
    };
  }, [tasks]);

  const handleFinished = useCallback(() => {
    setIsDialogOpen(false);
    setTaskToEdit(null);
    form.reset();
  }, [form]);

  const onSubmit = useCallback(async (values: z.infer<typeof taskSchema>) => {
    const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    // The task owner is resolved server-side from the session — no userId.
    // NOTE: send only backend-supported fields as a FULL object (see
    // buildTaskPayload): subject-as-string / tags / '' dueAt break Go binding,
    // and partial PATCHes wipe the row via full Save.
    const local: Task = {
      id: taskToEdit?.id ?? '',
      title: values.title,
      description: values.description || undefined,
      subject: values.subject,
      dueAt: values.dueAt || undefined,
      priority: values.priority ?? 'MEDIUM',
      estimatedTime: values.estimatedTime ?? 30,
      tags,
      status: taskToEdit?.status || 'PENDING',
      subtasks: taskToEdit?.subtasks,
    };

    try {
      const savedTask = taskToEdit
        ? await patchTaskRaw<Task>(taskToEdit.id, buildTaskPayload(local))
        : await createTaskRaw<Task>(buildTaskPayload(local));
      const next = mergeServerTask(local, savedTask);

      if (taskToEdit) {
        setTasks(prev => prev.map(t => t.id === savedTask.id ? next : t));
        if (onTaskUpdate) onTaskUpdate(next);
      } else {
        setTasks(prev => [next, ...prev]);
        if (onTaskCreate) onTaskCreate(next);
      }

      handleFinished();
    } catch (error) {
      logger.error("Error saving task:", error);
      toast.error('فشل حفظ المهمة — حاول مرة أخرى');
    }
  }, [taskToEdit, onTaskUpdate, onTaskCreate, handleFinished]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!taskId) return;

    try {
      await deleteTaskRaw(taskId);
    } catch (error: unknown) {
      // Backend DELETE returns HTTP 200 with `{success: true}` and NO `data`
      // key — the row IS deleted, only the client's envelope check fails.
      // Treat that specific contract mismatch as success; real failures
      // (network/4xx/5xx) still abort below.
      if (!(error instanceof ApiContractError)) {
        logger.error("Error deleting task:", error instanceof Error ? error.message : String(error));
        toast.error('فشل حذف المهمة — حاول مرة أخرى');
        return;
      }
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));
    onTaskDelete?.(taskId);
  }, [onTaskDelete]);

  const handleStatusChange = async (taskId: string, status: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const merged: Task = { ...task, status: status as Task['status'] };
      if (status === 'COMPLETED') {
        merged.completedAt = new Date().toISOString();
        if (timerSeconds > 0) merged.actualTime = Math.round(timerSeconds / 60);
      }

      const saved = await patchTaskRaw<Task>(taskId, buildTaskPayload(merged));
      const next = mergeServerTask(merged, saved);

      setTasks(prev => prev.map(t => t.id === taskId ? next : t));
      if (onTaskUpdate) onTaskUpdate(next);

      if (status === 'COMPLETED' && activeTimer === taskId) {
        setActiveTimer(null);
        setTimerSeconds(0);
      }
    } catch (error) {
      logger.error("Error updating task status:", error);
      toast.error('فشل تحديث حالة المهمة');
    }
  };

  const startTimer = (taskId: string) => {
    setActiveTimer(taskId);
    setTimerSeconds(0);
    handleStatusChange(taskId, 'IN_PROGRESS');
  };

  const stopTimer = () => {
    if (activeTimer) {
      const task = tasks.find(t => t.id === activeTimer);
      if (task) {
        const actualTime = (task.actualTime || 0) + Math.round(timerSeconds / 60);
        updateTaskField(activeTimer, 'actualTime', actualTime);
      }
    }
    setActiveTimer(null);
    setTimerSeconds(0);
  };

  const updateTaskField = async (taskId: string, field: string, value: unknown) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      // Full-object PATCH: the backend overwrites the whole row.
      const merged = { ...task, [field]: value } as Task;
      const saved = await patchTaskRaw<Task>(taskId, buildTaskPayload(merged));
      const next = mergeServerTask(merged, saved);

      setTasks(prev => prev.map(t => t.id === taskId ? next : t));
      onTaskUpdate?.(next);
    } catch (error) {
      logger.error("Error updating task:", error);
      toast.error('فشل تحديث المهمة');
    }
  };

  const addSubtask = async (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtask: SubTask = {
      id: `subtask_${Date.now()}`,
      title,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    await updateTaskField(taskId, 'subtasks', updatedSubtasks);

    setNewSubtaskTitle('');
    setAddingSubtaskTo(null);
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    await updateTaskField(taskId, 'subtasks', updatedSubtasks);
  };

  const handleBulkStatusChange = async (status: string) => {
    for (const taskId of selectedTaskIds) {
      await handleStatusChange(taskId, status);
    }
    setSelectedTaskIds([]);
    setBulkSelectMode(false);
  };

  const handleBulkDelete = async () => {
    for (const taskId of selectedTaskIds) {
      await handleDelete(taskId);
    }
    setSelectedTaskIds([]);
    setBulkSelectMode(false);
  };

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    form.reset({
      title: task.title,
      description: task.description || '',
      subject: task.subject || 'MATH',
      dueAt: task.dueAt || '',
      priority: task.priority || 'MEDIUM',
      estimatedTime: task.estimatedTime || 30,
      tags: task.tags?.join(', ') || ''
    });
    setIsDialogOpen(true);
  }, [form]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة المهام المتطورة</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>الإجمالي: {stats.total}</span>
            <span className="text-green-600">مكتملة: {stats.completed}</span>
            <span className="text-blue-600">قيد التنفيذ: {stats.inProgress}</span>
            <span className="text-yellow-600">في الانتظار: {stats.pending}</span>
            {stats.overdue > 0 && <span className="text-red-600">متأخرة: {stats.overdue}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSelectMode(!bulkSelectMode)}
          >
            {bulkSelectMode ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setTaskToEdit(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <TaskFormDialog
                taskToEdit={taskToEdit}
                subjects={subjects}
                form={form}
                onSubmit={onSubmit}
                onCancel={handleFinished}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showStats && <TaskStatsPanel stats={stats} />}

      <TaskFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={(value) => setFilter(value as typeof filter)}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        sortBy={sortBy}
        onSortByChange={(value) => setSortBy(value as typeof sortBy)}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        subjects={subjects}
        getAllTags={getAllTags}
        selectedTags={selectedTags}
        onTagToggle={(tag) => {
          if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
          } else {
            setSelectedTags([...selectedTags, tag]);
          }
        }}
      />

      {bulkSelectMode && selectedTaskIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedTaskIds.length}
          onComplete={() => handleBulkStatusChange('COMPLETED')}
          onStart={() => handleBulkStatusChange('IN_PROGRESS')}
          onDelete={handleBulkDelete}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-lg font-medium mb-2">لا توجد مهام</p>
                <p className="text-sm">
                  {searchQuery || filter !== 'all' || selectedTags.length > 0
                    ? 'لا توجد مهام تطابق المرشحات المحددة'
                    : 'اضغط على "مهمة جديدة" لإنشاء مهمة'}
                </p>
              </div>
            ) : (
              <VirtualList
                items={filteredTasks}
                itemHeight={160}
                containerHeight={600}
                keyExtractor={(task) => task.id}
                renderItem={(task) => (
                  <TaskListItem
                    task={task}
                    bulkSelectMode={bulkSelectMode}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelect={(id) => {
                      if (selectedTaskIds.includes(id)) {
                        setSelectedTaskIds(selectedTaskIds.filter(tid => tid !== id));
                      } else {
                        setSelectedTaskIds([...selectedTaskIds, id]);
                      }
                    }}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onEdit={handleEditTask}
                    onStartTimer={startTimer}
                    onStopTimer={stopTimer}
                    onCopyTitle={(title) => navigator.clipboard.writeText(title)}
                    activeTimer={activeTimer}
                    timerSeconds={timerSeconds}
                    expandedTasks={expandedTasks}
                    onToggleExpand={(id) => {
                      if (expandedTasks.includes(id)) {
                        setExpandedTasks(expandedTasks.filter(eid => eid !== id));
                      } else {
                        setExpandedTasks([...expandedTasks, id]);
                      }
                    }}
                    addingSubtaskTo={addingSubtaskTo}
                    setAddingSubtaskTo={setAddingSubtaskTo}
                    newSubtaskTitle={newSubtaskTitle}
                    setNewSubtaskTitle={setNewSubtaskTitle}
                    onAddSubtask={addSubtask}
                    onToggleSubtask={toggleSubtask}
                  />
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
