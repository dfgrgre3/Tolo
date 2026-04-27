"use client";

import { FC } from 'react';
import { Task, TaskStatus } from '@/types/tasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  getPriorityBadge: (priority: number) => React.ReactNode;
  getStatusIcon: (status: TaskStatus) => React.ReactNode;
  isOverdue: (dueAt: string | null | undefined) => boolean;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-0 group transition-all duration-500",
  divider: "rpg-divider my-4",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export const TaskList: FC<TaskListProps> = ({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  getPriorityBadge,
  getStatusIcon,
  isOverdue
}) => {
  if (tasks.length === 0) {
    return null; // Handled in parent
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, index) => {
          const overdue = isOverdue(task.dueAt) && task.status !== 'COMPLETED';
          const completed = task.status === 'COMPLETED';

          return (
            <m.div
              key={task.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              layout
              className="h-full">
              
              <Card className={`${STYLES.card} ${completed ? 'opacity-50 grayscale-[50%]' : 'hover:-translate-y-2'} ${overdue ? 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
                 <CardContent className="p-6 relative">
                    {/* Status Checkbox Portal */}
                    <div className="absolute top-6 left-6 z-10 flex items-center justify-center">
                       <Checkbox
                      checked={completed}
                      onCheckedChange={() => onStatusChange(task.id, task.status)}
                      className={`h-6 w-6 rounded-lg border-2 border-primary/50 bg-black/60 data-[state=checked]:bg-primary transition-all duration-300 transform scale-125 ${!completed ? 'hover:scale-150 hover:shadow-[0_0_15px_rgba(255,109,0,0.5)] hover:border-primary group-hover:border-primary/80' : ''}`} />
                    </div>

                    <div className="flex flex-col gap-6 pr-12">
                       <div className="space-y-2">
                          <div className="flex items-start gap-3">
                             <div className="mt-1 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
                               {getStatusIcon(task.status)}
                             </div>
                             <h3 className={`text-xl font-black transition-all duration-300 ${completed ? 'line-through text-gray-600' : 'text-white group-hover:text-primary group-hover:drop-shadow-[0_0_8px_rgba(255,109,0,0.5)]'}`}>
                                {task.title}
                             </h3>
                          </div>
                          {task.description &&
                      <p className="text-sm text-gray-500 line-clamp-2 pr-2 leading-relaxed group-hover:text-gray-300 transition-colors">
                               {task.description}
                             </p>
                      }
                       </div>

                       <div className="flex flex-wrap items-center gap-3">
                          {getPriorityBadge(task.priority)}
                          {task.subject &&
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold px-3 py-1 hover:bg-blue-500/20 transition-colors cursor-default">
                                {task.subject}
                             </Badge>
                      }
                          {task.dueAt &&
                      <Badge className={`${overdue ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-gray-200'} border-white/5 font-bold px-3 py-1 flex items-center gap-2 transition-colors`}>
                                <Calendar className="w-3 h-3 block" />
                                <span>{new Date(task.dueAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
                                {overdue && <span className="text-[10px] uppercase font-black tracking-tighter">(متأخر)</span>}
                             </Badge>
                      }
                       </div>

                       <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(task)}
                        className="h-10 w-10 p-0 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all hover:scale-110 border border-white/5 hover:border-primary/50">
                             <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                             <DialogTrigger asChild>
                                <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all hover:scale-110 border border-white/5 hover:border-red-500/50">
                                   <Trash2 className="h-4 w-4 shadow-sm" />
                                </Button>
                             </DialogTrigger>
                             <DialogContent className="bg-background border-red-500/20 text-gray-100 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                                <DialogHeader>
                                   <DialogTitle className="text-xl font-black flex items-center gap-3">
                                      <div className="p-2 bg-red-500/10 rounded-full">
                                        <AlertCircle className="text-red-500 w-6 h-6" />
                                      </div>
                                      <span className="text-red-500">حذف الأمر القتالي؟</span>
                                   </DialogTitle>
                                   <DialogDescription className="text-gray-400 py-4 font-medium text-base">
                                      هل أنت متأكد من مسح سجل هذه المهمة بشكل دائم؟ لن يكون بإمكانك استعادة نقاط الخبرة (XP) الضائعة في حال التراجع.
                                   </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-3 sm:gap-0">
                                   <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white rounded-xl h-12 font-bold transition-colors">إلغاء التراجع</Button>
                                   <Button
                                      variant="destructive"
                                      className="flex-1 rounded-xl h-12 font-black shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 transition-all"
                                      onClick={() => onDelete(task.id)}>
                                      تأكيد المسح
                                   </Button>
                                </DialogFooter>
                             </DialogContent>
                          </Dialog>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
