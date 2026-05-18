'use client';

import {
  CheckCircle,
  BookOpen,
  Calendar,
  Clock,
  Timer,
  Tag,
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Plus,
  X,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Task } from './task-types';
import {
  getPriorityColor,
  getPriorityText,
  getStatusColor,
  getStatusText,
  getDueDateInfo,
  formatTime,
} from './task-utils';

interface TaskListItemProps {
  readonly task: Task;
  readonly bulkSelectMode: boolean;
  readonly isSelected: boolean;
  readonly onToggleSelect: (taskId: string) => void;
  readonly onStatusChange: (taskId: string, status: string) => void;
  readonly onDelete: (taskId: string) => void;
  readonly onEdit: (task: Task) => void;
  readonly onStartTimer: (taskId: string) => void;
  readonly onStopTimer: () => void;
  readonly onCopyTitle: (title: string) => void;
  readonly activeTimer: string | null;
  readonly timerSeconds: number;
  readonly expandedTasks: string[];
  readonly onToggleExpand: (taskId: string) => void;
  readonly addingSubtaskTo: string | null;
  readonly setAddingSubtaskTo: (taskId: string | null) => void;
  readonly newSubtaskTitle: string;
  readonly setNewSubtaskTitle: (title: string) => void;
  readonly onAddSubtask: (taskId: string, title: string) => void;
  readonly onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

export function TaskListItem({
  task,
  bulkSelectMode,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onDelete,
  onEdit,
  onStartTimer,
  onStopTimer,
  onCopyTitle,
  activeTimer,
  timerSeconds,
  expandedTasks,
  onToggleExpand,
  addingSubtaskTo,
  setAddingSubtaskTo,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onAddSubtask,
  onToggleSubtask,
}: TaskListItemProps) {
  const dueDateInfo = getDueDateInfo(task.dueAt);
  const isExpanded = expandedTasks.includes(task.id);
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div
      className={cn(
        "border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
        task.status === 'COMPLETED' && 'bg-green-50 dark:bg-green-900/10',
        bulkSelectMode && isSelected && 'bg-blue-50 dark:bg-blue-900/20'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {bulkSelectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(task.id)}
              aria-label={`تحديد المهمة ${task.title}`}
              className="mt-1"
            />
          )}

          <Button
            size="sm"
            variant="outline"
            className={cn(
              "mt-1 h-6 w-6 p-0 shrink-0",
              task.status === 'COMPLETED'
                ? "bg-green-500 hover:bg-green-600 border-green-500 text-white"
                : "border-gray-300 dark:border-gray-600"
            )}
            onClick={() => onStatusChange(
              task.id,
              task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
            )}
          >
            {task.status === 'COMPLETED' && <CheckCircle className="h-4 w-4" />}
          </Button>

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

                {activeTimer === task.id && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <Timer className="h-4 w-4 text-blue-600" />
                    <span className="font-mono text-blue-600">
                      {formatTime(timerSeconds)}
                    </span>
                    <Button size="sm" variant="outline" onClick={onStopTimer}>
                      <Square className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {task.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (activeTimer === task.id) {
                        onStopTimer();
                      } else {
                        onStartTimer(task.id);
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

                {totalSubtasks > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleExpand(task.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCopyTitle(task.title)}>
                      <Copy className="h-4 w-4 mr-2" />
                      نسخ العنوان
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {task.status !== 'IN_PROGRESS' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}>
                        <Play className="h-4 w-4 mr-2" />
                        بدء العمل
                      </DropdownMenuItem>
                    )}

                    {task.status !== 'COMPLETED' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'COMPLETED')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        إكمال
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isExpanded && task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  {task.subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={subtask.isCompleted}
                        onChange={() => onToggleSubtask(task.id, subtask.id)}
                        aria-label={`تحديد المهمة الفرعية ${subtask.title}`}
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

            {isExpanded && (
              <div className="mt-3">
                {addingSubtaskTo === task.id ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="مهمة فرعية جديدة"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                          onAddSubtask(task.id, newSubtaskTitle);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newSubtaskTitle.trim()) {
                          onAddSubtask(task.id, newSubtaskTitle);
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
}
