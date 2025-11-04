'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Filter, Search, Calendar, Clock, Tag, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Task, TaskStatus, SubjectType } from '@/types/tasks';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskAnalytics } from '@/components/tasks/TaskAnalytics';
import { TaskList } from '@/components/tasks/TaskList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(1, { message: 'العنوان مطلوب' }),
  description: z.string().optional(),
  subject: z.nativeEnum(SubjectType).optional(),
  dueAt: z.string().optional(),
  priority: z.number().int().min(0).max(2).optional(),
});

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

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    setLoading(true);
    fetch('/api/tasks')
      .then((res) => {
        if (!res.ok) throw new Error('فشل في جلب المهام');
        return res.json();
      })
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((error) => {
        toast.error(error.message);
        setLoading(false);
      });
  };

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const searchTermLower = searchTerm.toLowerCase();
        return (statusFilter === 'ALL' || task.status === statusFilter) && 
               (task.title.toLowerCase().includes(searchTermLower) || 
                (task.description && task.description.toLowerCase().includes(searchTermLower)));
      })
      .sort((a, b) => {
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
  }, [tasks, statusFilter, sortBy, searchTerm]);

  const handleAddTaskSubmit = (data: z.infer<typeof taskSchema>) => {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) throw new Error('فشل في إضافة المهمة');
        return res.json();
      })
      .then((newTask) => {
        setTasks([...tasks, newTask]);
        reset();
        setIsAddDialogOpen(false);
        toast.success('تمت إضافة المهمة بنجاح');
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleEditTaskSubmit = (data: z.infer<typeof taskSchema>) => {
    if (!editingTask) return;

    fetch(`/api/tasks/${editingTask.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then((res) => {
        if (!res.ok) throw new Error('فشل في تحديث المهمة');
        return res.json();
      })
      .then((updatedTask) => {
        setTasks(tasks.map((task) => (task.id === editingTask.id ? updatedTask : task)));
        setEditingTask(null);
        reset();
        setIsEditDialogOpen(false);
        toast.success('تم تحديث المهمة بنجاح');
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    const newStatus = status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    fetch(`/api/tasks/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      .then((res) => {
        if (!res.ok) throw new Error('فشل في تحديث حالة المهمة');
        return res.json();
      })
      .then((updatedTask) => {
        setTasks(tasks.map((task) => (task.id === id ? updatedTask : task)));
        toast.success(`تم ${newStatus === 'COMPLETED' ? 'إكمال' : 'إعادة فتح'} المهمة بنجاح`);
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleDeleteTask = (id: string) => {
    fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('فشل في حذف المهمة');
        setTasks(tasks.filter((task) => task.id !== id));
        toast.success('تم حذف المهمة بنجاح');
      })
      .catch((error) => {
        toast.error(error.message);
      });
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
        return <Badge className="bg-red-500 hover:bg-red-600">عالية</Badge>;
      case 1:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">متوسطة</Badge>;
      default:
        return <Badge className="bg-green-500 hover:bg-green-600">منخفضة</Badge>;
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'PENDING':
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const isOverdue = (dueAt: string | undefined) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="container mx-auto p-4 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مركز المهام</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => reset()}>
              <Plus className="mr-2 h-4 w-4" />
              إضافة مهمة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>إضافة مهمة</DialogTitle>
              <DialogDescription>
                أضف مهمة جديدة إلى قائمة مهامك. املأ الحقول أدناه للمتابعة.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddTaskSubmit)} className="grid gap-4 py-4">
              <TaskForm control={control} register={register} errors={errors} />
              <DialogFooter>
                <Button type="submit">إضافة</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <TaskAnalytics tasks={tasks} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
          <TabsTrigger value="inProgress">قيد التنفيذ</TabsTrigger>
          <TabsTrigger value="completed">مكتملة</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <TaskList 
            tasks={filteredAndSortedTasks} 
            onStatusChange={handleStatusChange}
            onEdit={openEditDialog}
            onDelete={handleDeleteTask}
            getPriorityBadge={getPriorityBadge}
            getStatusIcon={getStatusIcon}
            isOverdue={isOverdue}
          />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <TaskList 
            tasks={filteredAndSortedTasks.filter(task => task.status === 'PENDING')} 
            onStatusChange={handleStatusChange}
            onEdit={openEditDialog}
            onDelete={handleDeleteTask}
            getPriorityBadge={getPriorityBadge}
            getStatusIcon={getStatusIcon}
            isOverdue={isOverdue}
          />
        </TabsContent>
        <TabsContent value="inProgress" className="mt-4">
          <TaskList 
            tasks={filteredAndSortedTasks.filter(task => task.status === 'IN_PROGRESS')} 
            onStatusChange={handleStatusChange}
            onEdit={openEditDialog}
            onDelete={handleDeleteTask}
            getPriorityBadge={getPriorityBadge}
            getStatusIcon={getStatusIcon}
            isOverdue={isOverdue}
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <TaskList 
            tasks={filteredAndSortedTasks.filter(task => task.status === 'COMPLETED')} 
            onStatusChange={handleStatusChange}
            onEdit={openEditDialog}
            onDelete={handleDeleteTask}
            getPriorityBadge={getPriorityBadge}
            getStatusIcon={getStatusIcon}
            isOverdue={isOverdue}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
            <Search className="h-5 w-5"/>
            <Input 
                placeholder="بحث في المهام..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
            />
        </div>
        <div className="flex items-center gap-2">
            <Filter className="h-5 w-5"/>
            <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} onClick={() => setStatusFilter('ALL')}>الكل</Button>
            <Button variant={statusFilter === TaskStatus.PENDING ? 'default' : 'outline'} onClick={() => setStatusFilter(TaskStatus.PENDING)}>قيد الانتظار</Button>
            <Button variant={statusFilter === TaskStatus.IN_PROGRESS ? 'default' : 'outline'} onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)}>قيد التنفيذ</Button>
            <Button variant={statusFilter === TaskStatus.COMPLETED ? 'default' : 'outline'} onClick={() => setStatusFilter(TaskStatus.COMPLETED)}>مكتملة</Button>
        </div>
        <Select value={sortBy} onValueChange={(value: 'dueAt' | 'priority') => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فرز حسب" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="priority">الأولوية</SelectItem>
                <SelectItem value="dueAt">تاريخ الاستحقاق</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تعديل المهمة</DialogTitle>
              <DialogDescription>
                قم بتعديل تفاصيل المهمة أدناه. انقر على حفظ عند الانتهاء.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleEditTaskSubmit)} className="grid gap-4 py-4">
               <TaskForm control={control} register={register} errors={errors} />
               <DialogFooter>
                 <Button type="submit">حفظ التغييرات</Button>
               </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* هذا القسم تم استبداله بمكون Tabs و TaskList في الأعلى */}
    </div>
  );
}
