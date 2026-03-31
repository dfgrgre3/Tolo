'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Eye, EyeOff, Play } from 'lucide-react';
import { motion } from "framer-motion";
import type { Task } from '../types';

interface UpcomingTasksCardProps {
  tasks: Task[];
  showCompleted: boolean;
  onToggleView: () => void;
  onTabChange: (tab: string) => void;
  onTimerToggle: (taskId?: string) => void;
}

export default function UpcomingTasksCard({
  tasks,
  showCompleted,
  onToggleView,
  onTabChange,
  onTimerToggle
}: UpcomingTasksCardProps) {
  const displayTasks = tasks
    .filter(task => showCompleted || task.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueAt || '').getTime() - new Date(b.dueAt || '').getTime())
    .slice(0, 5);

  return (
    <Card className="border-white/10 shadow-xl bg-background/60 backdrop-blur-xl relative overflow-hidden h-full">
      <CardHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 relative z-10 border-b border-primary/10">
        <CardTitle className="flex items-center text-lg">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2 shadow-[0_0_10px_rgba(var(--primary),0.2)]">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          المهام القادمة
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleView}
          className="hover:bg-primary/10 transition-colors"
        >
          {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <motion.div 
          className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {displayTasks.map((task) => (
            <motion.div 
              key={task.id} 
              variants={{
                hidden: { x: 20, opacity: 0 },
                visible: { x: 0, opacity: 1 }
              }}
              whileHover={{ scale: 1.02 }}
              className="group flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm rounded-xl cursor-pointer transition-all duration-300 border border-white/5 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary),0.15)] relative overflow-hidden"
              onClick={() => onTabChange("tasks")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex-1 relative z-10">
                <p className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{task.title}</p>
                {task.dueAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <span className="text-primary/70">📅</span>
                    {new Date(task.dueAt).toLocaleDateString('ar-EG', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <Badge 
                  variant={task.status === 'PENDING' ? 'secondary' : task.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                  className={`font-medium tracking-wide ${
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 
                    task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : ''
                  }`}
                >
                  {task.status === 'PENDING' ? 'قيد الانتظار' : 
                   task.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'مكتمل'}
                </Badge>
                <Button 
                  size="icon" 
                  className="h-10 w-10 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/30 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] group-hover:animate-pulse"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimerToggle(task.id);
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
          {displayTasks.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10 flex flex-col items-center"
            >
              <div className="mb-4 text-5xl opacity-50 grayscale">📝</div>
              <p className="text-muted-foreground font-semibold text-lg">لا توجد مهام قادمة</p>
              <p className="text-sm text-muted-foreground mt-1">أوروبي لمهام ومغامرات جديدة!</p>
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

