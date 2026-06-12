"use client";

import React from "react";
import { m } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecentActivitySidebarProps {
  recentActivities: { id: string; title: string; time: string; xp: string; icon: React.ElementType; color: string }[];
  glassStyle: string;
}

export function RecentActivitySidebar({ recentActivities, glassStyle }: RecentActivitySidebarProps) {
  return (
    <Card className={glassStyle + " border-white/5 bg-transparent p-6 space-y-6"}>
      {recentActivities.length > 0 ? (
        recentActivities.map((activity) => {
          const Icon = activity.icon;
          return (
            <m.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all cursor-default group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/5 ${activity.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight line-clamp-1">{activity.title}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{activity.time}</p>
                </div>
              </div>
              {activity.xp && (
                <Badge className="text-[10px] font-black bg-emerald-500 text-black">
                  {activity.xp}
                </Badge>
              )}
            </m.div>
          );
        })
      ) : (
        <div className="text-center py-8 text-gray-500">لا توجد نشاطات مؤخراً</div>
      )}
      
      <Button variant="ghost" className="w-full text-gray-500 font-black hover:text-white hover:bg-white/5 text-xs py-2 h-auto rounded-xl">
        عرض الأرشيف الكامل
      </Button>
    </Card>
  );
}
