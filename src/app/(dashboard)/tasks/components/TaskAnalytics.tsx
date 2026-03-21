import { Task } from '@/types/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TaskAnalyticsProps {
  tasks: Task[];
}

export function TaskAnalytics({ tasks }: TaskAnalyticsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter(task => task.status === 'PENDING').length;
  const overdueTasks = tasks.filter(task => 
    task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'COMPLETED'
  ).length;
  
  const highPriorityTasks = tasks.filter(task => task.priority === 2).length;
  const mediumPriorityTasks = tasks.filter(task => task.priority === 1).length;
  const lowPriorityTasks = tasks.filter(task => task.priority === 0).length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ملخص المهام</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{totalTasks}</div>
          <div className="text-sm text-gray-500">المجموع</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold">{completedTasks}</div>
          <div className="text-sm text-gray-500">مكتملة</div>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold">{inProgressTasks}</div>
          <div className="text-sm text-gray-500">قيد التنفيذ</div>
        </div>
        
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold">{pendingTasks}</div>
          <div className="text-sm text-gray-500">في الانتظار</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold">{overdueTasks}</div>
          <div className="text-sm text-gray-500">متأخرة</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold">{completionPercentage}%</div>
          <div className="text-sm text-gray-500">نسبة الإنجاز</div>
        </div>
        
        <div className="md:col-span-3 lg:col-span-6 mt-4">
          <div className="flex justify-between mb-1">
            <span>إتمام المهام</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="w-full" />
        </div>
        
        <div className="md:col-span-3 lg:col-span-6 grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-semibold text-red-500">{highPriorityTasks}</div>
            <div className="text-sm text-gray-500">أولوية عالية</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-yellow-500">{mediumPriorityTasks}</div>
            <div className="text-sm text-gray-500">أولوية متوسطة</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-green-500">{lowPriorityTasks}</div>
            <div className="text-sm text-gray-500">أولوية منخفضة</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
