"use client";

import { memo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts";

export interface DashboardChartPoint {
  name: string;
  earnings: number;
  enrollments: number;
}

// Isolated chart: recharts renders synchronously and is expensive.
// Memoized + loaded dynamically so it never blocks the dashboard shell.
function DashboardChart({ data }: { data: DashboardChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            direction: "rtl",
            textAlign: "right",
            borderRadius: "12px",
            border: "1px solid rgba(200,200,200,0.2)",
            fontSize: "11px",
          }}
        />
        <Area
          type="monotone"
          dataKey="earnings"
          name="الأرباح (ج.م)"
          stroke="#f97316"
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#colorEarnings)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="enrollments"
          name="التسجيلات"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default memo(DashboardChart);
