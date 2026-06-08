'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TaskStats {
  readonly total: number;
  readonly completed: number;
  readonly pending: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly totalEstimatedTime: number;
  readonly totalActualTime: number;
  readonly completionRate: number;
}

interface TaskStatsPanelProps {
  readonly stats: TaskStats;
}

export function TaskStatsPanel({ stats }: TaskStatsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          إحصائيات المهام
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600">معدل الإنجاز</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{Math.round(stats.totalEstimatedTime / 60)}h</div>
            <div className="text-sm text-gray-600">الوقت المتوقع</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.totalActualTime / 60)}h</div>
            <div className="text-sm text-gray-600">الوقت الفعلي</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600">مهام متأخرة</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between mb-2">
            <span>التقدم الإجمالي</span>
            <span>{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
