import { Button } from "@/components/ui/button";
import { Settings, Download, Upload, Activity, Clock, Brain, Trophy } from 'lucide-react';
import type { WeekStats } from './types';
import { m } from "framer-motion";

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
    <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-6 bg-background/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden group">
      {/* Decorative Gradient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -mr-10 -mt-10" />
      
      <div className="relative z-10">
        <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3 mb-3">
          <Trophy className="h-8 w-8 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          خريطة الأسبوع الاستراتيجية
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]">
            <Activity className="h-4 w-4" />
            <span>المجموع: {weekStats.totalBlocks}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
            <Clock className="h-4 w-4" />
            <span>دراسة: {weekStats.studyHours}س</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]">
            <Brain className="h-4 w-4" />
            <span>مكتمل: {weekStats.completedBlocks}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 relative z-10">
        <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="icon"
            onClick={onSettingsClick}
            className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 h-12 w-12"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </m.div>
        
        <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 h-12 w-12"
          >
            <Download className="w-5 h-5" />
          </Button>
        </m.div>
        
        <label className="cursor-pointer">
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 h-12 transition-all duration-300 font-bold backdrop-blur-md">
              <Upload className="w-5 h-5" />
              <span>استيراد الخطة</span>
            </div>
          </m.div>
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
