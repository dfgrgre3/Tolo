"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";

interface HeatmapData {
  date: string;
  count: number;
  level?: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  title?: string;
  className?: string;
  color?: "green" | "blue" | "purple" | "orange";
  onCellClick?: (date: string) => void;
}

const colorSchemes = {
  green: {
    0: "bg-gray-100 dark:bg-gray-800",
    1: "bg-green-200 dark:bg-green-900",
    2: "bg-green-300 dark:bg-green-700",
    3: "bg-green-400 dark:bg-green-600",
    4: "bg-green-500 dark:bg-green-500",
  },
  blue: {
    0: "bg-gray-100 dark:bg-gray-800",
    1: "bg-blue-200 dark:bg-blue-900",
    2: "bg-blue-300 dark:bg-blue-700",
    3: "bg-blue-400 dark:bg-blue-600",
    4: "bg-blue-500 dark:bg-blue-500",
  },
  purple: {
    0: "bg-gray-100 dark:bg-gray-800",
    1: "bg-purple-200 dark:bg-purple-900",
    2: "bg-purple-300 dark:bg-purple-700",
    3: "bg-purple-400 dark:bg-purple-600",
    4: "bg-purple-500 dark:bg-purple-500",
  },
  orange: {
    0: "bg-gray-100 dark:bg-gray-800",
    1: "bg-orange-200 dark:bg-orange-900",
    2: "bg-orange-300 dark:bg-orange-700",
    3: "bg-orange-400 dark:bg-orange-600",
    4: "bg-orange-500 dark:bg-orange-500",
  },
};

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function getLevel(count: number, maxCount: number): number {
  if (count === 0) return 0;
  const ratio = count / maxCount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = MONTHS_AR[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function ActivityHeatmap({
  data,
  title = "خريطة النشاط",
  className,
  color = "green",
  onCellClick,
}: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = React.useState<string | null>(null);

  // Generate last 12 weeks (84 days) of data
  const generateGridData = React.useCallback(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83); // 12 weeks

    const grid: Array<Array<{ date: string; count: number; level: number }>> = [];
    const dataMap = new Map(data.map(d => [d.date, d.count]));

    let currentDate = new Date(startDate);
    
    // Adjust to start from Sunday
    while (currentDate.getDay() !== 0) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    for (let week = 0; week < 13; week++) {
      const weekData: Array<{ date: string; count: number; level: number }> = [];
      
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = dataMap.get(dateStr) || 0;
        weekData.push({ date: dateStr, count, level: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      grid.push(weekData);
    }

    // Calculate levels
    const maxCount = Math.max(...grid.flat().map(d => d.count), 1);
    grid.forEach(week => {
      week.forEach(cell => {
        cell.level = getLevel(cell.count, maxCount);
      });
    });

    return grid;
  }, [data]);

  const gridData = React.useMemo(() => generateGridData(), [generateGridData]);

  // Get months for header
  const monthLabels = React.useMemo(() => {
    const months: Array<{ month: string; colSpan: number }> = [];
    let currentMonth = -1;
    let colSpan = 0;

    gridData.forEach((week) => {
      const date = new Date(week[0].date);
      const month = date.getMonth();
      
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          months.push({ month: MONTHS_AR[currentMonth], colSpan });
        }
        currentMonth = month;
        colSpan = 1;
      } else {
        colSpan++;
      }
    });

    if (currentMonth !== -1) {
      months.push({ month: MONTHS_AR[currentMonth], colSpan });
    }

    return months;
  }, [gridData]);

  // Calculate total activity
  const totalActivity = React.useMemo(() => {
    return gridData.flat().reduce((sum, cell) => sum + cell.count, 0);
  }, [gridData]);

  const colorScheme = colorSchemes[color];

  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalActivity.toLocaleString()} نشاط في آخر 12 أسبوع
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex gap-1 mb-2 mr-8">
          {monthLabels.map((m, i) => (
            <div
              key={i}
              className="text-xs text-muted-foreground text-center"
              style={{ width: `${m.colSpan * 12}px`, minWidth: `${m.colSpan * 12}px` }}
            >
              {m.colSpan >= 2 ? m.month : ""}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1">
            {DAYS_AR.map((day, i) => (
              <div
                key={i}
                className="h-3 text-xs text-muted-foreground flex items-center"
                style={{ width: "28px" }}
              >
                {i % 2 === 1 ? day.slice(0, 3) : ""}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {gridData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((cell, dayIndex) => (
                  <Tooltip key={`${weekIndex}-${dayIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                          colorScheme[cell.level as keyof typeof colorScheme],
                          hoveredCell === cell.date && "ring-2 ring-primary"
                        )}
                        onClick={() => onCellClick?.(cell.date)}
                        onMouseEnter={() => setHoveredCell(cell.date)}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="text-center">
                        <div className="font-semibold">{formatDate(cell.date)}</div>
                        <div className="text-muted-foreground">
                          {cell.count.toLocaleString()} نشاط
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
        <span className="text-xs text-muted-foreground">أقل</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-3 w-3 rounded-sm",
              colorScheme[level as keyof typeof colorScheme]
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground">أكثر</span>
      </div>
    </AdminCard>
  );
}
