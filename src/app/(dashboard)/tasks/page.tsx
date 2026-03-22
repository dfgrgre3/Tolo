"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Filter, 
  Search, 
  Calendar, 
  Clock, 
  Tag, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Sword, 
  Shield, 
  Target, 
  Sparkles,
  Scroll,
  Zap,
  Flame
} from 'lucide-react';
import { Task, TaskStatus, SubjectType } from '@/types/tasks';
import { TaskForm, TaskAnalytics, TaskList } from '@/app/(dashboard)/tasks/components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { safeFetch } from '@/lib/safe-client-utils';

const taskSchema = z.object({
  title: z.string().min(1, { message: 'ط§ظ„ط¹ظ†ظˆط§ظ† ظ…ط·ظ„ظˆط¨' }),
  description: z.string().optional(),
  subject: z.nativeEnum(SubjectType).optional(),
  dueAt: z.string().optional(),
  priority: z.number().int().min(0).max(2).optional(),
});

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'dueAt' | 'priority'>('priority');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const extractTaskFromPayload = (payload: { data?: Task } | Task | null): Task | null => {
    if (!payload) return null;
    return 'id' in payload ? payload : payload.data ?? null;
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
  });

  const fetchTasks = async () => {
    setLoading(true);

    try {
      const { data, error } = await safeFetch<Task[]>('/api/tasks', undefined, []);

      if (error) {
        throw error;
      }

      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في جلب المهام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    
    if (activeTab === 'pending') {
      result = result.filter(task => task.status === 'PENDING');
    } else if (activeTab === 'inProgress') {
      result = result.filter(task => task.status === 'IN_PROGRESS');
    } else if (activeTab === 'completed') {
      result = result.filter(task => task.status === 'COMPLETED');
    } else if (statusFilter !== 'ALL') {
      result = result.filter(task => task.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term)) ||
        (task.subject && task.subject.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority - a.priority;
      }
      if (sortBy === 'dueAt') {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      return 0;
    });

    return result;
  }, [tasks, statusFilter, sortBy, searchTerm, activeTab]);

  const handleAddTaskSubmit = async (data: z.infer<typeof taskSchema>) => {
    try {
      const { data: payload, error } = await safeFetch<{ data?: Task } | Task>(
        '/api/tasks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        null
      );

      if (error) {
        throw error;
      }

      const newTask = extractTaskFromPayload(payload);
      if (!newTask) {
        throw new Error('فشل في إضافة المهمة');
      }

      setTasks([...tasks, newTask]);
      reset();
      setIsAddDialogOpen(false);
      toast.success('تمت إضافة المهمة بنجاح');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إضافة المهمة');
    }
  };

  const handleEditTaskSubmit = async (data: z.infer<typeof taskSchema>) => {
    if (!editingTask) return;

    try {
      const { data: payload, error } = await safeFetch<{ data?: Task } | Task>(
        `/api/tasks/${editingTask.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        null
      );

      if (error) {
        throw error;
      }

      const updatedTask = extractTaskFromPayload(payload);
      if (!updatedTask) {
        throw new Error('فشل في تحديث المهمة');
      }

      setTasks(tasks.map((task) => (task.id === editingTask.id ? updatedTask : task)));
      setEditingTask(null);
      reset();
      setIsEditDialogOpen(false);
      toast.success('تم تحديث المهمة بنجاح');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث المهمة');
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const newStatus = status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    try {
      const { data: payload, error } = await safeFetch<{ data?: Task } | Task>(
        `/api/tasks/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
        null
      );

      if (error) {
        throw error;
      }

      const updatedTask = extractTaskFromPayload(payload);
      if (!updatedTask) {
        throw new Error('فشل في تحديث حالة المهمة');
      }

      setTasks(tasks.map((task) => (task.id === id ? updatedTask : task)));
      toast.success(`تم ${newStatus === 'COMPLETED' ? 'إكمال' : 'إعادة فتح'} المهمة بنجاح`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة المهمة');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await safeFetch(`/api/tasks/${id}`, { method: 'DELETE' }, null);

      if (error) {
        throw error;
      }

      setTasks(tasks.filter((task) => task.id !== id));
      toast.success('تم حذف المهمة بنجاح');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المهمة');
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setValue('title', task.title);
    setValue('description', task.description || '');
    setValue('subject', task.subject || undefined);
    setValue('dueAt', task.dueAt ? new Date(task.dueAt).toISOString().substring(0, 16) : '');
    setValue('priority', task.priority);
    setIsEditDialogOpen(true);
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 2:
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black">ط£ظ‡ظ…ظٹط© ظ…ظ„ط­ظ…ظٹط©</Badge>;
      case 1:
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black">ظ…ظ‡ظ…ط© ظ‚طھط§ظ„ظٹط©</Badge>;
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black">ظ…ظ‡ظ…ط© ط¬ط§ظ†ط¨ظٹط©</Badge>;
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'PENDING':
        return <Circle className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  const isOverdue = (dueAt: string | undefined) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 selection:bg-primary/30 selection:text-white" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        
        {/* --- Header Section --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="space-y-4 text-center md:text-right">
             <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-500">
                <Scroll className="w-4 h-4" />
                <span>ط³ط¬ظ„ ط§ظ„ظ…ظ‡ط§ظ… ط§ظ„ظ†ط´ط· (Quest Log)</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight">
               ظ‚ط§ط¦ظ…ط© <span className={STYLES.neonText}>ط§ظ„ظ…ط®ط§ط·ط± ظˆط§ظ„ظ…ظ‡ط§ظ…</span>
             </h1>
             <p className="text-gray-400 font-medium max-w-xl text-lg">
                ط£ظƒظ…ظ„ ظ…ظ‡ط§ظ…ظƒ ظ„ط±ط¨ط­ ط±طµظٹط¯ XP ظˆط±ظپط¹ ظ…ط³طھظˆط§ظƒ. طھط°ظƒط±طŒ ظƒظ„ ظ…ظ‡ظ…ط© طھظ‚ط±ط¨ظƒ ط®ط·ظˆط© ظ…ظ† ط§ظ„ظ†طµط±!
             </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => reset()} className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.3)] gap-3 border-2 border-white/10 group transition-all hover:scale-105 active:scale-95">
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                <span>ط¥ط¶ط§ظپط© ظ…ظ‡ظ…ط© ظ…ظ„ط­ظ…ظٹط©</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background border-white/10 text-gray-100">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">ط¥طµط¯ط§ط± ط£ظ…ط± ظ…ظ‡ظ…ط©</DialogTitle>
                <DialogDescription className="text-gray-400">
                  ط­ط¯ط¯ طھظپط§طµظٹظ„ ط§ظ„ظ…ظ‡ظ…ط© ظˆط§ظ„ظ‚ط§ط¦ط¯ ط§ظ„ظ…ط³ط¤ظˆظ„.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddTaskSubmit)} className="grid gap-4 py-4">
                <TaskForm control={control} register={register} errors={errors} />
                <DialogFooter>
                  <Button type="submit" className="w-full bg-primary font-black">طھط«ط¨ظٹطھ ط§ظ„ظ…ظ‡ظ…ط©</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Analytics Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className={STYLES.glass + " p-6 flex flex-col items-center justify-center text-center gap-2 group hover:border-primary/50 transition-all cursor-default"}>
              <Flame className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-gray-500 font-bold uppercase">ط§ظ„ظ…ظ‡ط§ظ… ط§ظ„ظ†ط´ط·ط©</p>
              <p className="text-3xl font-black">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
           </div>
           <div className={STYLES.glass + " p-6 flex flex-col items-center justify-center text-center gap-2 group hover:border-emerald-500/50 transition-all cursor-default"}>
              <Zap className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-gray-500 font-bold uppercase">ط§ظ„ظ…ظ‡ط§ظ… ط§ظ„ظ…ظ†ط¬ط²ط©</p>
              <p className="text-3xl font-black">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
           </div>
           <div className={STYLES.glass + " p-6 flex flex-col items-center justify-center text-center gap-2 group hover:border-red-500/50 transition-all cursor-default"}>
              <AlertCircle className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-gray-500 font-bold uppercase">ظ…ظ‡ط§ظ… ظ…طھط£ط®ط±ط©</p>
              <p className="text-3xl font-black text-red-500">{tasks.filter(t => isOverdue(t.dueAt) && t.status !== 'COMPLETED').length}</p>
           </div>
           <div className={STYLES.glass + " p-6 flex flex-col items-center justify-center text-center gap-2 group hover:border-amber-500/50 transition-all cursor-default"}>
              <Sparkles className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-gray-500 font-bold uppercase">XP ط§ظ„ظ…ظƒطھط³ط¨</p>
              <p className="text-3xl font-black text-amber-400">+{tasks.filter(t => t.status === 'COMPLETED').length * 100}</p>
           </div>
        </div>

        {/* --- Main Tasks Container --- */}
        <div className={STYLES.glass + " p-1 sm:p-2 md:p-8"}>
          
          {/* Filters & Tabs Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-10 p-4 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-3xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="bg-white/5 border border-white/5 p-1 h-12 rounded-xl gap-1">
                <TabsTrigger value="all" className="rounded-lg font-bold data-[state=active]:bg-primary">ط§ظ„ظƒظ„</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg font-bold data-[state=active]:bg-primary">ط§ظ„ظ…ط¹ظ„ظ‚ط©</TabsTrigger>
                <TabsTrigger value="inProgress" className="rounded-lg font-bold data-[state=active]:bg-primary">ط§ظ„ط¬ط§ط±ظٹ طھظ†ظپظٹط°ظ‡ط§</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-lg font-bold data-[state=active]:bg-primary">ط§ظ„ظ…ظ†طھظ‡ظٹط©</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
               <div className="relative group flex-1 min-w-[200px]">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                  <Input 
                    placeholder="ط¨ط­ط« ظپظٹ ط£ط±ط´ظٹظپ ط§ظ„ظ…ظ‡ط§ظ…..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pr-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary focus:border-primary shadow-inner"
                  />
               </div>
               
               <Select value={sortBy} onValueChange={(value: 'dueAt' | 'priority') => setSortBy(value)}>
                  <SelectTrigger className="w-[180px] h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                      <SelectValue placeholder="ظپط±ط² ط§ظ„ظ…ط­ط§ط±ط¨ظٹظ†" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-gray-100">
                      <SelectItem value="priority">ط­ط³ط¨ ط§ظ„ط£ظ‡ظ…ظٹط©</SelectItem>
                      <SelectItem value="dueAt">ط­ط³ط¨ ط§ظ„ظˆظ‚طھ</SelectItem>
                  </SelectContent>
               </Select>
            </div>
          </div>

          {/* Task List Component */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-[400px]"
                >
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                   <TaskList 
                      tasks={filteredAndSortedTasks} 
                      onStatusChange={handleStatusChange}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteTask}
                      getPriorityBadge={getPriorityBadge}
                      getStatusIcon={getStatusIcon}
                      isOverdue={isOverdue}
                    />
                    {filteredAndSortedTasks.length === 0 && (
                      <div className="text-center py-20 space-y-4">
                         <div className="mx-auto w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <Sword className="w-10 h-10 text-gray-600" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-xl font-black">ظ„ط§ طھظˆط¬ط¯ ظ…ظ‡ظ…ط§طھ ظ…ط³ط¬ظ„ط©</p>
                            <p className="text-gray-500">ظ…ظ†ط·ظ‚طھظƒ ط¢ظ…ظ†ط© طھظ…ط§ظ…ط§ظ‹طŒ ط§ظ„ظ‚ط§ط¦ط¯ ظ…ط±طھط§ط­.</p>
                         </div>
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Edit Task Dialog --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px] bg-background border-white/10 text-gray-100">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">طھط¹ط¯ظٹظ„ ط§ظ„ط£ظˆط§ظ…ط±</DialogTitle>
                <DialogDescription className="text-gray-400">
                  ظ‚ظ… ط¨طھط¹ط¯ظٹظ„ طھظپط§طµظٹظ„ ط§ظ„ظ…ظ‡ظ…ط© ط§ظ„ط­ط§ظ„ظٹط©.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleEditTaskSubmit)} className="grid gap-4 py-4">
                 <TaskForm control={control} register={register} errors={errors} />
                 <DialogFooter>
                   <Button type="submit" className="w-full bg-primary font-black">طھط­ط¯ظٹط« ط§ظ„ظ…ظ‡ظ…ط©</Button>
                 </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
