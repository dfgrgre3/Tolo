'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/shared/badge";
import { Progress } from "@/shared/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  X,
  Filter,
  SortAsc,
  SortDesc,
  Search,
  Tag,
  AlertTriangle,
  Star,
  Timer,
  Eye,
  EyeOff,
  Copy,
  Archive,
  Trash2,
  Edit,
  Play,
  Pause,
  Square,
  BarChart3,
  Target,
  Award,
  Zap,
  Brain,
  Coffee,
  Moon,
  Sun,
  Flame,
  Heart,
  Users,
  MessageCircle,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isThisWeek, isPast, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

// Locally define SubjectType values for client-side validation
const SUBJECT_TYPE_VALUES = [
  "MATH",
  "PHYSICS", 
  "CHEMISTRY",
  "ARABIC",
  "ENGLISH"
] as const;

// Enhanced Task interface
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject?: typeof SUBJECT_TYPE_VALUES[number];
  dueAt?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  tags?: string[];
  subtasks?: SubTask[];
  attachments?: string[];
  notes?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

type SubjectType = typeof SUBJECT_TYPE_VALUES[number];

// Enhanced Zod schema for task validation
const taskSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(100, "العنوان طويل جداً"),
  description: z.string().optional(),
  subject: z.enum(SUBJECT_TYPE_VALUES).optional(),
  dueAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedTime: z.number().min(1).max(480).optional(), // 1 minute to 8 hours
  tags: z.string().optional(),
});

interface TaskManagementProps {
  initialTasks: Task[];
  userId: string;
  subjects: SubjectType[];
  onTaskUpdate?: (task: Task) => void;
  onTaskCreate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export default function TaskManagement({ 
  initialTasks, 
  userId, 
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
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('list');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  
  // Advanced features
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Subtask management
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      estimatedTime: 30,
      tags: ''
    }
  });

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Get all unique tags from tasks
  const getAllTags = useMemo(() => {
    const allTags = tasks.flatMap(task => task.tags || []);
    return [...new Set(allTags)];
  }, [tasks]);

  // Memoize filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => {
      // Text search
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filter === 'pending' && task.status !== 'PENDING') return false;
      if (filter === 'in_progress' && task.status !== 'IN_PROGRESS') return false;
      if (filter === 'completed' && task.status !== 'COMPLETED') return false;
      if (filter === 'overdue' && (!task.dueAt || !isPast(new Date(task.dueAt)) || task.status === 'COMPLETED')) return false;
      
      // Subject filter
      if (selectedSubject !== 'all' && task.subject !== selectedSubject) return false;
      
      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
      
      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.some(tag => task.tags?.includes(tag))) return false;
      
      // Show completed filter
      if (!showCompleted && task.status === 'COMPLETED') return false;
      
      return true;
    });

    // Sort tasks
    filteredTasks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueAt && !b.dueAt) comparison = 0;
          else if (!a.dueAt) comparison = 1;
          else if (!b.dueAt) comparison = -1;
          else comparison = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
          break;
        case 'created':
          comparison = new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
          break;
        case 'priority':
          const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          comparison = (priorityOrder[b.priority || 'MEDIUM'] || 2) - (priorityOrder[a.priority || 'MEDIUM'] || 2);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          const statusOrder = { 'PENDING': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'CANCELLED': 4 };
          comparison = (statusOrder[a.status || 'PENDING'] || 1) - (statusOrder[b.status || 'PENDING'] || 1);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredTasks;
  }, [tasks, searchQuery, filter, selectedSubject, selectedPriority, selectedTags, showCompleted, sortBy, sortOrder]);

  // Memoize task statistics
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
    const endpoint = taskToEdit ? `/api/tasks/${taskToEdit.id}` : '/api/tasks';
    const method = taskToEdit ? 'PATCH' : 'POST';
    
    // Process tags
    const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const body = JSON.stringify({ 
      ...values, 
      userId,
      tags,
      status: taskToEdit?.status || 'PENDING'
    });

    try {
      const response = await fetch(endpoint, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body 
      });
      
      if (!response.ok) throw new Error('Failed to save task');
      const savedTask = await response.json();
      
      if (taskToEdit) {
        setTasks(tasks.map(t => t.id === savedTask.id ? savedTask : t));
        if (onTaskUpdate) onTaskUpdate(savedTask);
      } else {
        setTasks([savedTask, ...tasks]);
        if (onTaskCreate) onTaskCreate(savedTask);
      }
      
      handleFinished();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }, [taskToEdit, userId, onTaskUpdate, onTaskCreate, handleFinished]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }
      
      setTasks(prev => prev.filter(t => t.id !== taskId));
      onTaskDelete?.(taskId);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }, [onTaskDelete]);

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date().toISOString();
        updateData.actualTime = timerSeconds > 0 ? Math.round(timerSeconds / 60) : undefined;
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) throw new Error('Failed to update task status');
      const updatedTask = await response.json();
      
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (onTaskUpdate) onTaskUpdate(updatedTask);
      
      // Stop timer if task is completed
      if (status === 'COMPLETED' && activeTimer === taskId) {
        setActiveTimer(null);
        setTimerSeconds(0);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // Timer functions
  const startTimer = (taskId: string) => {
    setActiveTimer(taskId);
    setTimerSeconds(0);
    handleStatusChange(taskId, 'IN_PROGRESS');
  };

  const stopTimer = () => {
    if (activeTimer) {
      const task = tasks.find(t => t.id === activeTimer);
      if (task) {
        // Update actual time
        const actualTime = (task.actualTime || 0) + Math.round(timerSeconds / 60);
        updateTaskField(activeTimer, 'actualTime', actualTime);
      }
    }
    setActiveTimer(null);
    setTimerSeconds(0);
  };

  const updateTaskField = async (taskId: string, field: string, value: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      const updatedTask = await response.json();
      
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (onTaskUpdate) onTaskUpdate(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Subtask functions
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
    if (!task || !task.subtasks) return;
    
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    
    await updateTaskField(taskId, 'subtasks', updatedSubtasks);
  };

  // Bulk operations
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

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority text
  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'عاجل';
      case 'HIGH': return 'مهم';
      case 'MEDIUM': return 'متوسط';
      case 'LOW': return 'منخفض';
      default: return 'متوسط';
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'CANCELLED': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'مكتملة';
      case 'IN_PROGRESS': return 'قيد التنفيذ';
      case 'CANCELLED': return 'ملغية';
      default: return 'في الانتظار';
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get due date info
  const getDueDateInfo = (dueAt?: string) => {
    if (!dueAt) return null;
    
    const dueDate = new Date(dueAt);
    const now = new Date();
    
    if (isPast(dueDate)) {
      return { text: 'متأخر', color: 'text-red-600', urgent: true };
    } else if (isToday(dueDate)) {
      return { text: 'اليوم', color: 'text-orange-600', urgent: true };
    } else if (isTomorrow(dueDate)) {
      return { text: 'غداً', color: 'text-yellow-600', urgent: false };
    } else if (isThisWeek(dueDate)) {
      return { text: 'هذا الأسبوع', color: 'text-blue-600', urgent: false };
    } else {
      const days = differenceInDays(dueDate, now);
      return { text: `خلال ${days} يوم`, color: 'text-gray-600', urgent: false };
    }
  };


  return (
    <div className="space-y-6">
      {/* Header with Stats */}
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
              <DialogHeader>
                <DialogTitle>
                  {taskToEdit ? 'تعديل المهمة' : 'مهمة جديدة'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>العنوان *</FormLabel>
                        <FormControl>
                          <Input placeholder="عنوان المهمة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea placeholder="وصف تفصيلي للمهمة" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>المادة</FormLabel>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المادة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects.map(subject => (
                                <SelectItem key={subject} value={subject}>
                                  {subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>الأولوية</FormLabel>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">منخفضة</SelectItem>
                              <SelectItem value="MEDIUM">متوسطة</SelectItem>
                              <SelectItem value="HIGH">مهمة</SelectItem>
                              <SelectItem value="URGENT">عاجلة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dueAt"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>تاريخ الاستحقاق</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="estimatedTime"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>الوقت المتوقع (دقيقة)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="480" 
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>العلامات</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="علامة1, علامة2, علامة3" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleFinished}>
                      إلغاء
                    </Button>
                    <Button type="submit">
                      {taskToEdit ? 'تحديث' : 'إنشاء'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              إحصائيات المهام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
                <div className="text-sm text-gray-600">معدل الإنجاز</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{Math.round(stats.totalEstimatedTime / 60)}h</div>
                <div className="text-sm text-gray-600">الوقت المتوقع</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Math.round(stats.totalActualTime / 60)}h</div>
                <div className="text-sm text-gray-600">الوقت الفعلي</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.overdue}</div>
                <div className="text-sm text-gray-600">مهام متأخرة</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span>التقدم الإجمالي</span>
                <span>{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في المهام..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المهام</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المواد</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأولويات</SelectItem>
                  <SelectItem value="URGENT">عاجلة</SelectItem>
                  <SelectItem value="HIGH">مهمة</SelectItem>
                  <SelectItem value="MEDIUM">متوسطة</SelectItem>
                  <SelectItem value="LOW">منخفضة</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">الموعد</SelectItem>
                  <SelectItem value="created">الإنشاء</SelectItem>
                  <SelectItem value="priority">الأولوية</SelectItem>
                  <SelectItem value="title">العنوان</SelectItem>
                  <SelectItem value="status">الحالة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tags Filter */}
          {getAllTags().length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 self-center">العلامات:</span>
                {getAllTags().map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {bulkSelectMode && selectedTaskIds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                تم تحديد {selectedTaskIds.length} مهمة
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleBulkStatusChange('COMPLETED')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  إكمال
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('IN_PROGRESS')}>
                  <Play className="h-4 w-4 mr-1" />
                  بدء
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  حذف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
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
              filteredTasks.map((task, index) => {
                const dueDateInfo = getDueDateInfo(task.dueAt);
                const isExpanded = expandedTasks.includes(task.id);
                const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
                const totalSubtasks = task.subtasks?.length || 0;
                
                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                      task.status === 'COMPLETED' && 'bg-green-50 dark:bg-green-900/10',
                      bulkSelectMode && selectedTaskIds.includes(task.id) && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Bulk Select Checkbox */}
                        {bulkSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTaskIds([...selectedTaskIds, task.id]);
                              } else {
                                setSelectedTaskIds(selectedTaskIds.filter(id => id !== task.id));
                              }
                            }}
                            className="mt-1"
                          />
                        )}
                        
                        {/* Status Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "mt-1 h-6 w-6 p-0 shrink-0",
                            task.status === 'COMPLETED' 
                              ? "bg-green-500 hover:bg-green-600 border-green-500 text-white" 
                              : "border-gray-300 dark:border-gray-600"
                          )}
                          onClick={() => handleStatusChange(
                            task.id, 
                            task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
                          )}
                        >
                          {task.status === 'COMPLETED' && <CheckCircle className="h-4 w-4" />}
                        </Button>
                        
                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={cn(
                                  "font-medium text-lg",
                                  task.status === 'COMPLETED' && "line-through text-gray-500"
                                )}>
                                  {task.title}
                                </h3>
                                
                                {/* Priority Indicator */}
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  getPriorityColor(task.priority)
                                )} />
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              
                              {/* Task Meta Info */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {task.subject && (
                                  <Badge variant="secondary" className="text-xs">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {task.subject}
                                  </Badge>
                                )}
                                
                                <Badge variant="outline" className="text-xs">
                                  {getPriorityText(task.priority)}
                                </Badge>
                                
                                <Badge className={cn("text-xs", getStatusColor(task.status))}>
                                  {getStatusText(task.status)}
                                </Badge>
                                
                                {dueDateInfo && (
                                  <Badge 
                                    variant={dueDateInfo.urgent ? "destructive" : "outline"} 
                                    className="text-xs"
                                  >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {dueDateInfo.text}
                                  </Badge>
                                )}
                                
                                {task.estimatedTime && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {task.estimatedTime}د
                                  </Badge>
                                )}
                                
                                {task.actualTime && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Timer className="h-3 w-3 mr-1" />
                                    {task.actualTime}د فعلي
                                  </Badge>
                                )}
                                
                                {totalSubtasks > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {completedSubtasks}/{totalSubtasks}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Tags */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {task.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Timer Display */}
                              {activeTimer === task.id && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  <Timer className="h-4 w-4 text-blue-600" />
                                  <span className="font-mono text-blue-600">
                                    {formatTime(timerSeconds)}
                                  </span>
                                  <Button size="sm" variant="outline" onClick={stopTimer}>
                                    <Square className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {/* Timer Button */}
                              {task.status !== 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (activeTimer === task.id) {
                                      stopTimer();
                                    } else {
                                      startTimer(task.id);
                                    }
                                  }}
                                  className={cn(
                                    activeTimer === task.id && "bg-blue-100 border-blue-300"
                                  )}
                                >
                                  {activeTimer === task.id ? (
                                    <Square className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {/* Expand Button */}
                              {totalSubtasks > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedTasks(expandedTasks.filter(id => id !== task.id));
                                    } else {
                                      setExpandedTasks([...expandedTasks, task.id]);
                                    }
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {/* More Actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setTaskToEdit(task);
                                    form.reset({
                                      title: task.title,
                                      description: task.description,
                                      subject: task.subject,
                                      dueAt: task.dueAt,
                                      priority: task.priority,
                                      estimatedTime: task.estimatedTime,
                                      tags: task.tags?.join(', ')
                                    });
                                    setIsDialogOpen(true);
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    تعديل
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem onClick={() => {
                                    navigator.clipboard.writeText(task.title);
                                  }}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    نسخ العنوان
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {task.status !== 'IN_PROGRESS' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}>
                                      <Play className="h-4 w-4 mr-2" />
                                      بدء العمل
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {task.status !== 'COMPLETED' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'COMPLETED')}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      إكمال
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDelete(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          {/* Subtasks */}
                          {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                              <div className="space-y-2">
                                {task.subtasks.map(subtask => (
                                  <div key={subtask.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={subtask.isCompleted}
                                      onChange={() => toggleSubtask(task.id, subtask.id)}
                                      className="rounded"
                                    />
                                    <span className={cn(
                                      "text-sm",
                                      subtask.isCompleted && "line-through text-gray-500"
                                    )}>
                                      {subtask.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Add Subtask */}
                          {isExpanded && (
                            <div className="mt-3">
                              {addingSubtaskTo === task.id ? (
                                <div className="flex gap-2">
                                  <Input
                                    size="sm"
                                    placeholder="مهمة فرعية جديدة"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                        addSubtask(task.id, newSubtaskTitle);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (newSubtaskTitle.trim()) {
                                        addSubtask(task.id, newSubtaskTitle);
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAddingSubtaskTo(null);
                                      setNewSubtaskTitle('');
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingSubtaskTo(task.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  إضافة مهمة فرعية
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}