import React from 'react';
import { Task, TaskStatus } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/shared/badge';
import { Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  getPriorityBadge: (priority: number) => React.ReactNode;
  getStatusIcon: (status: TaskStatus) => React.ReactNode;
  isOverdue: (dueAt: string | undefined) => boolean;
}

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
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">لا توجد مهام لعرضها</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className={`border-l-4 transition-all duration-200 hover:shadow-md ${
            task.priority === 2 ? 'border-red-500' : 
            task.priority === 1 ? 'border-yellow-500' : 'border-green-500'
          } ${task.status === 'COMPLETED' ? 'opacity-75' : ''}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={task.status === 'COMPLETED'}
                  onCheckedChange={() => onStatusChange(task.id, task.status)}
                />
                <span className={`${task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </span>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>هل أنت متأكد؟</DialogTitle>
                      <DialogDescription>
                        هذا الإجراء سيقوم بحذف المهمة نهائياً. لا يمكن التراجع عن هذا الإجراء.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {}}
                      >
                        إلغاء
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => onDelete(task.id)}
                      >
                        حذف
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  <span className="text-sm text-gray-500">
                    {task.status === 'PENDING' && 'قيد الانتظار'}
                    {task.status === 'IN_PROGRESS' && 'قيد التنفيذ'}
                    {task.status === 'COMPLETED' && 'مكتملة'}
                  </span>
                </div>
                {getPriorityBadge(task.priority)}
              </div>
              
              {task.description && (
                <p className="text-sm text-gray-600 mt-2">{task.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {task.subject && (
                  <Badge variant="secondary" className="text-xs">
                    {task.subject}
                  </Badge>
                )}
                
                {task.dueAt && (
                  <Badge 
                    variant={isOverdue(task.dueAt) ? "destructive" : "outline"} 
                    className="text-xs flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3" />
                    {new Date(task.dueAt).toLocaleDateString()}
                    {isOverdue(task.dueAt) && (
                      <span className="text-xs">(متأخر)</span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};