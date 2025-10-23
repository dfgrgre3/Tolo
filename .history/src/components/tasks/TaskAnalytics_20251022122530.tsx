import { Task } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/card';
import { Progress } from '@/components/ui/progress';

interface TaskAnalyticsProps {
  tasks: Task[];
}

export function TaskAnalytics({ tasks }: TaskAnalyticsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ملخص المهام</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex justify-between">
          <span>إجمالي المهام</span>
          <span>{totalTasks}</span>
        </div>
        <div className="flex justify-between">
          <span>المهام المكتملة</span>
          <span>{completedTasks}</span>
        </div>
        <div className="flex justify-between">
          <span>المهام المتبقية</span>
          <span>{pendingTasks}</span>
        </div>
        <div>
          <Progress value={completionPercentage} className="w-full" />
          <p className="text-center text-sm mt-2">{completionPercentage.toFixed(0)}% مكتمل</p>
        </div>
      </CardContent>
    </Card>
  );
}
