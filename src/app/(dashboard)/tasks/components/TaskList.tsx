import React, { memo } from 'react';
import { Task, TaskStatus } from '@/types/tasks';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskList = memo(({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskListProps) => {
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
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

TaskList.displayName = 'TaskList';
