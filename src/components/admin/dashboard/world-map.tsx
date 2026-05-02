"use client";

import * as React from "react";
import { Map, Compass, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  x: number; // 0-100
  y: number; // 0-100
  activity: number; // 0-100
  status: "active" | "warning" | "critical";
}

const LOCATIONS: Location[] = [
  { id: "1", name: "محور القاهرة التعليمي", x: 65, y: 35, activity: 85, status: "active" },
  { id: "2", name: "محور الإسكندرية", x: 45, y: 25, activity: 65, status: "active" },
  { id: "3", name: "جبهة الدقهلية", x: 75, y: 20, activity: 45, status: "warning" },
  { id: "4", name: "قطاع الصعيد", x: 60, y: 70, activity: 30, status: "active" },
  { id: "5", name: "ثغرة بورسعيد", x: 85, y: 25, activity: 15, status: "critical" },
];

export function WorldMap() {
  return (
    <div className="rpg-glass p-8 border-primary/10 relative overflow-hidden group">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.05)_0%,transparent_70%)] opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="font-black text-xl flex items-center gap-3">
            <Compass className="h-6 w-6 text-primary" />
            <span>خارطة الانتشار الاستراتيجي</span>
          </h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">تحركات المحاربين الحية عبر الأقاليم</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">LIVE RADAR ACTIVE</span>
           </div>
        </div>
      </div>

      <div className="relative h-[400px] w-full rounded-3xl border border-white/5 bg-black/40 shadow-inner overflow-hidden">
        {/* Simple SVG Map Background (Egypt-ish shape placeholder) */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-10 blur-[1px]">
           <path 
            d="M20,10 L80,10 L90,90 L10,90 Z" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            className="text-primary"
           />
        </svg>

        {/* Scan Line Effect */}
        <div 
          className="absolute inset-x-0 h-px bg-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.5)] z-20"
        />

        {/* Points of Interest */}
        {LOCATIONS.map((loc) => (
          <div
            key={loc.id}
            className="absolute z-30"
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
          >
            <div className="relative group/pin">
               {/* Pulse Effect */}
               <div className={cn(
                  "absolute -inset-4 rounded-full opacity-20 animate-ping",
                  loc.status === "active" ? "bg-green-500" : loc.status === "warning" ? "bg-yellow-500" : "bg-red-500"
               )} />
               
               {/* Pin Marker */}
               <div className={cn(
                  "h-4 w-4 rounded-full border-2 border-white shadow-xl transition-transform hover:scale-150 cursor-crosshair",
                  loc.status === "active" ? "bg-green-500" : loc.status === "warning" ? "bg-yellow-500" : "bg-red-500"
               )} />

               {/* Tooltip */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none min-w-[150px] z-50">
                  <div className="rpg-glass p-3 rounded-2xl border-primary/30 bg-black/80 backdrop-blur-xl">
                     <p className="text-[10px] font-black mb-1">{loc.name}</p>
                     <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                           <Users className="w-3 h-3" />
                           <span>نشاط: {loc.activity}%</span>
                        </div>
                        <div className={cn(
                           "text-[8px] font-black uppercase px-1 rounded",
                           loc.status === "active" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        )}>
                           {loc.status}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {/* Radar Circular Grid */}
        <div className="absolute inset-0 pointer-events-none">
           {[20, 40, 60, 80].map((radius) => (
             <div 
               key={radius}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full"
               style={{ width: `${radius}%`, height: `${radius * 1}%` }}
             />
           ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8">
         <div className="space-y-2">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">إجمالي الحضور</span>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-black">1,402</span>
               <span className="text-[10px] text-green-500 font-bold">+12%</span>
            </div>
         </div>
         <div className="space-y-2 border-x border-white/5 px-6">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">المناطق النشطة</span>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-black">12/15</span>
               <span className="text-[10px] text-primary font-bold">OPTIMAL</span>
            </div>
         </div>
         <div className="space-y-2">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">مستوى التهديد</span>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-black text-amber-500">LOW</span>
               <Shield className="w-3 h-3 text-amber-500" />
            </div>
         </div>
      </div>
    </div>
  );
}
