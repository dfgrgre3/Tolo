'use client';

import { useState } from 'react';
import StatsCards from './StatsCards';
import PerformanceMetrics from './PerformanceMetrics';
import UpcomingRemindersCard from './UpcomingRemindersCard';
import UpcomingTasksCard from './UpcomingTasksCard';
import QuickActions from './QuickActions';
import AdvancedReports from './AdvancedReports';
import { Button } from "@/shared/button";
import { BarChart3, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TimeStats, Task, Reminder, SubjectType, StudySession } from '../types';

interface DashboardTabProps {
  stats: TimeStats;
  subjects: SubjectType[];
  tasks: Task[];
  reminders: Reminder[];
  studySessions: StudySession[];
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
  studySessions,
  showCompletedTasks,
  showUpcomingRemindersOnly,
  onTabChange,
  onToggleCompletedTasks,
  onToggleUpcomingReminders,
  onTimerToggle
}: DashboardTabProps) {
  const [showReports, setShowReports] = useState(false);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-task':
        onTabChange('tasks');
        break;
      case 'new-reminder':
        onTabChange('reminders');
        break;
      case 'start-timer':
        onTimerToggle();
        onTabChange('tracker');
        break;
      case 'view-schedule':
        onTabChange('schedule');
        break;
      case 'view-analytics':
        setShowReports(true);
        break;
      case 'view-history':
        onTabChange('history');
        break;
      case 'quick-study':
        onTimerToggle();
        onTabChange('tracker');
        break;
      default:
        break;
    }
  };

  const handleExportReport = () => {
    // Create a simple text report
    const report = `
تقرير الأداء - ${new Date().toLocaleDateString('ar-EG')}

الإحصائيات:
- المهام المكتملة: ${stats.completedTasks}
- المهام المعلقة: ${stats.pendingTasks}
- ساعات المذاكرة: ${stats.studyHours}
- التذكيرات القادمة: ${stats.upcomingReminders}
- تقدم الهدف اليومي: ${Math.round(stats.dailyGoalProgress)}%
- تقدم الهدف الأسبوعي: ${Math.round(stats.weeklyGoalProgress)}%
- سلسلة الأيام: ${stats.streakDays} يوم
- درجة التركيز: ${stats.focusScore}%

---
تم إنشاء التقرير من لوحة تنظيم الوقت
    `;
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الأداء_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <StatsCards 
          stats={stats} 
          subjectsCount={subjects.length}
          onTabChange={onTabChange}
        />
      </div>
      
      <div className="animate-in fade-in slide-in-from-top-4 duration-700" style={{ animationDelay: '100ms' }}>
        <QuickActions onAction={handleQuickAction} />
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

      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                تقارير الأداء المتقدمة
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReports(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <AdvancedReports
            tasks={tasks}
            studySessions={studySessions}
            reminders={reminders}
            stats={stats}
            onExport={handleExportReport}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

