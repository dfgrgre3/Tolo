'use client';

import StatsCards from './StatsCards';
import PerformanceMetrics from './PerformanceMetrics';
import UpcomingRemindersCard from './UpcomingRemindersCard';
import UpcomingTasksCard from './UpcomingTasksCard';
import type { TimeStats, Task, Reminder, SubjectType } from '../types';

interface DashboardTabProps {
  stats: TimeStats;
  subjects: SubjectType[];
  tasks: Task[];
  reminders: Reminder[];
  showCompletedTasks: boolean;
  showUpcomingRemindersOnly: boolean;
  onTabChange: (tab: string) => void;
  onToggleCompletedTasks: () => void;
  onToggleUpcomingReminders: () => void;
  onTimerToggle: (taskId?: string) => void;
}

export default function DashboardTab({
  stats,
  subjects,
  tasks,
  reminders,
  showCompletedTasks,
  showUpcomingRemindersOnly,
  onTabChange,
  onToggleCompletedTasks,
  onToggleUpcomingReminders,
  onTimerToggle
}: DashboardTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <StatsCards 
          stats={stats} 
          subjectsCount={subjects.length}
          onTabChange={onTabChange}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="lg:col-span-2">
          <PerformanceMetrics stats={stats} totalTasks={tasks.length} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="animate-in fade-in slide-in-from-right-4 duration-700">
            <UpcomingRemindersCard
              reminders={reminders}
              showUpcomingOnly={showUpcomingRemindersOnly}
              onToggleView={onToggleUpcomingReminders}
              onTabChange={onTabChange}
            />
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-4 duration-700" style={{ animationDelay: '200ms' }}>
            <UpcomingTasksCard
              tasks={tasks}
              showCompleted={showCompletedTasks}
              onToggleView={onToggleCompletedTasks}
              onTabChange={onTabChange}
              onTimerToggle={onTimerToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

