"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface GrowthPoint {
  name: string;
  balance: number;
}

export default function WalletGrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length <= 1) {
    return (
      <div className="h-[80%] flex flex-col items-center justify-center text-gray-500 gap-4">
        <TrendingUp className="w-16 h-16 opacity-10 animate-pulse" />
        <p className="text-sm font-bold opacity-40">بيانات النمو ستظهر هنا قريباً</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="80%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "20px",
            color: "hsl(var(--popover-foreground))",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
          itemStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: "900" }}
          cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 2, strokeDasharray: "5 5" }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="hsl(var(--primary))"
          strokeWidth={6}
          fillOpacity={1}
          fill="url(#colorBalance)"
          animationDuration={2500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
