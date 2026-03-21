"use client";

import React from 'react';
import { Task, TaskStatus } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, Clock, Sword, Shield, Target, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  getPriorityBadge: (priority: number) => React.ReactNode;
  getStatusIcon: (status: TaskStatus) => React.ReactNode;
  isOverdue: (dueAt: string | undefined) => boolean;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-0 group",
  divider: "rpg-divider my-4",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export const TaskList: React.FC<TaskListProps> = ({
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
      <AnimatePresence>
        {tasks.map((task, index) => {
          const overdue = isOverdue(task.dueAt) && task.status !== 'COMPLETED';
          const completed = task.status === 'COMPLETED';

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
              className="h-full"
            >
              <Card className={`${STYLES.card} ${completed ? 'opacity-50' : ''} ${overdue ? 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
                 <CardContent className="p-6 relative">
                    {/* Status Checkbox Portal */}
                    <div className="absolute top-6 left-6 z-10">
                       <Checkbox
                          checked={completed}
                          onCheckedChange={() => onStatusChange(task.id, task.status)}
                          className="h-6 w-6 rounded-lg border-2 border-primary/50 bg-black/60 data-[state=checked]:bg-primary transition-all duration-300 transform scale-125"
                        />
                    </div>

                    <div className="flex flex-col gap-6 pr-12">
                       <div className="space-y-2">
                          <div className="flex items-center gap-3">
                             {getStatusIcon(task.status)}
                             <h3 className={`text-xl font-black transition-all ${completed ? 'line-through text-gray-600' : 'text-white'}`}>
                                {task.title}
                             </h3>
                          </div>
                          {task.description && (
                             <p className="text-sm text-gray-500 line-clamp-2 pr-2">
                               {task.description}
                             </p>
                          )}
                       </div>

                       <div className="flex flex-wrap items-center gap-3">
                          {getPriorityBadge(task.priority)}
                          {task.subject && (
                             <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold px-3 py-1">
                                {task.subject}
                             </Badge>
                          )}
                          {task.dueAt && (
                             <Badge className={`${overdue ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400'} border-white/5 font-bold px-3 py-1 flex items-center gap-2`}>
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(task.dueAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
                                {overdue && <span className="text-[10px] uppercase font-black tracking-tighter">(متأخر)</span>}
                             </Badge>
                          )}
                       </div>

                       <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4 mt-auto">
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => onEdit(task)}
                             className="h-10 w-10 p-0 rounded-xl hover:bg-white/5 hover:text-primary transition-colors"
                          >
                             <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                             <DialogTrigger asChild>
                                <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-10 w-10 p-0 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                >
                                   <Trash2 className="h-4 w-4 shadow-sm" />
                                </Button>
                             </DialogTrigger>
                             <DialogContent className="bg-background border-white/10 text-gray-100">
                                <DialogHeader>
                                   <DialogTitle className="text-xl font-black flex items-center gap-3">
                                      <AlertCircle className="text-red-500" />
                                      <span>حذف الأمر القتالي؟</span>
                                   </DialogTitle>
                                   <DialogDescription className="text-gray-400 py-4">
                                      هل أنت متأكد من تذمير سجل هذه المهمة؟ لن يكون بإمكانك استعادة نقاط الخبرة الضائعة.
                                   </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-3">
                                   <Button variant="outline" className="flex-1 bg-white/5 border-white/10 rounded-xl h-12 font-bold">إلغاء التراجع</Button>
                                   <Button 
                                      variant="destructive" 
                                      className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-red-500/20"
                                      onClick={() => onDelete(task.id)}
                                   >
                                      تذمير المهمة
                                   </Button>
                                </DialogFooter>
                             </DialogContent>
                          </Dialog>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
