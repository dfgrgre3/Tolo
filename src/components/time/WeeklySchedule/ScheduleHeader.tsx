import { Button } from "@/shared/button";
import { Settings, Download, Upload } from 'lucide-react';
import type { WeekStats } from './types';

interface ScheduleHeaderProps {
  weekStats: WeekStats;
  onSettingsClick: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ScheduleHeader({ 
  weekStats, 
  onSettingsClick, 
  onExport, 
  onImport 
}: ScheduleHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">الجدول الأسبوعي المتطور</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>المجموع: {weekStats.totalBlocks}</span>
          <span className="text-blue-600">دراسة: {weekStats.studyHours}س</span>
          <span className="text-green-600">استراحة: {weekStats.breakHours}س</span>
          <span className="text-purple-600">مكتمل: {weekStats.completedBlocks}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
        >
          <Settings className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="w-4 h-4" />
        </Button>
        
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="sr-only">استيراد</span>
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={onImport}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

