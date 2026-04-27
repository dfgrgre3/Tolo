"use client";

import * as React from "react";
import { m } from "framer-motion";
import { Activity, Database, Cpu, Zap, Shield, HardDrive } from "lucide-react";

interface PulseItemProps {
  label: string;
  value: number;
  max: number;
  icon: any;
  color: "red" | "blue" | "green" | "purple" | "yellow";
  unit?: string;
}

function PulseBar({ label, value, max, icon: Icon, color, unit = "%" }: PulseItemProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colors = {
    red: "from-red-600 to-rose-400 shadow-red-500/20",
    blue: "from-blue-600 to-sky-400 shadow-blue-500/20",
    green: "from-emerald-600 to-teal-400 shadow-emerald-500/20",
    purple: "from-purple-600 to-indigo-400 shadow-purple-500/20",
    yellow: "from-amber-500 to-yellow-300 shadow-amber-500/20",
  };

  const ringColors = {
    red: "border-red-500/20 bg-red-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-emerald-500/20 bg-emerald-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    yellow: "border-amber-500/20 bg-amber-500/5",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${ringColors[color]}`}>
            <Icon className={`w-4 h-4 ${color === "yellow" ? "text-amber-500" : `text-${color}-500`}`} />
          </div>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
        </div>
        <span className="text-sm font-black font-mono">
          {value}{unit}
        </span>
      </div>
      
      <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
         <m.div
           initial={{ width: 0 }}
           animate={{ width: `${percentage}%` }}
           transition={{ duration: 1, ease: "easeOut" }}
           className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors[color]} shadow-lg`}
         />
         {/* Glass highlight */}
         <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

export function SystemPulse() {
  const [stats, setStats] = React.useState({
    cpu: 24,
    ram: 42,
    db: 12,
    api: 98,
    cache: 88,
  });

  // Simulate real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(30, Math.min(95, prev.ram + (Math.random() * 4 - 2))),
        db: Math.max(5, Math.min(40, prev.db + (Math.random() * 6 - 3))),
        api: Math.max(90, Math.min(100, prev.api + (Math.random() * 2 - 1))),
        cache: Math.max(80, Math.min(99, prev.cache + (Math.random() * 2 - 1))),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rpg-glass p-8 space-y-8 border-primary/20">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <span>نبض النظام - System Pulse</span>
        </h3>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500" />
           <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest text-shadow-sm">متصل</span>
        </div>
      </div>

      <div className="grid gap-8">
        <PulseBar 
          label="صحة المعالج (HP)" 
          value={Math.round(stats.cpu)} 
          max={100} 
          icon={Cpu} 
          color="red" 
        />
        <PulseBar 
          label="طاقة الذاكرة (MP)" 
          value={Math.round(stats.ram)} 
          max={100} 
          icon={HardDrive} 
          color="blue" 
        />
        <PulseBar 
          label="استدعاء السجلات (DB)" 
          value={Math.round(stats.db)} 
          max={100} 
          icon={Database} 
          color="purple" 
        />
        <PulseBar 
          label="نجاح التعاويذ (API)" 
          value={Math.round(stats.api)} 
          max={100} 
          icon={Zap} 
          color="yellow" 
        />
        <PulseBar 
          label="سرعة البديهة (Cache)" 
          value={Math.round(stats.cache)} 
          max={100} 
          icon={Shield} 
          color="green" 
        />
      </div>

      <div className="pt-4 border-t border-white/5">
         <p className="text-[10px] text-gray-500 font-bold leading-relaxed text-center">
            تتم مراقبة جميع أجهزة المملكة في الوقت الفعلي. أي خلل سيتم إرسال غراب زاجل فوراً.
         </p>
      </div>
    </div>
  );
}
