'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Button } from "@/shared/button";
import { BookOpen, Eye, EyeOff, Play } from 'lucide-react';
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
    <Card className="border-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardTitle className="flex items-center">
          <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
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
      <CardContent className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {displayTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-gray-100/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border border-gray-200/50 dark:border-gray-700/50"
              onClick={() => onTabChange("tasks")}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-1">
                <p className="font-semibold text-base mb-1">{task.title}</p>
                {task.dueAt && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span>📅</span>
                    {new Date(task.dueAt).toLocaleDateString('ar-EG', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={task.status === 'PENDING' ? 'secondary' : task.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                  className="font-medium"
                >
                  {task.status === 'PENDING' ? 'في الانتظار' : 
                   task.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'مكتمل'}
                </Badge>
                <Button 
                  size="sm" 
                  className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimerToggle(task.id);
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {displayTasks.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-2 text-4xl">📝</div>
              <p className="text-muted-foreground font-medium">لا توجد مهام قادمة</p>
              <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء مهمة جديدة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

