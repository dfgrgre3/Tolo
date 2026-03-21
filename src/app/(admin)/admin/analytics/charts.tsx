"use client";

import React from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { AdminBadge } from "@/components/admin/ui/admin-badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const DailyActiveUsersChart = ({ data }: { data: Array<{ date: string; count: number }> }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsAreaChart data={data}>
      <defs>
        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
      <XAxis
        dataKey="date"
        className="text-xs"
        tickFormatter={(value) => new Date(value).toLocaleDateString("ar-EG", { weekday: "short" })}
      />
      <YAxis className="text-xs" />
      <Tooltip
        contentStyle={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
        }}
        labelFormatter={(value) => new Date(value).toLocaleDateString("ar-EG")}
      />
      <Area
        type="monotone"
        dataKey="count"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        fillOpacity={1}
        fill="url(#colorCount)"
      />
    </RechartsAreaChart>
  </ResponsiveContainer>
);

export const DailyRegistrationsChart = ({ data }: { data: Array<{ date: string; count: number }> }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
      <XAxis
        dataKey="date"
        className="text-xs"
        tickFormatter={(value) => new Date(value).toLocaleDateString("ar-EG", { weekday: "short" })}
      />
      <YAxis className="text-xs" />
      <Tooltip
        contentStyle={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
        }}
        labelFormatter={(value) => new Date(value).toLocaleDateString("ar-EG")}
      />
      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
    </RechartsBarChart>
  </ResponsiveContainer>
);

export const RoleDistributionChart = ({ data }: { data: Array<{ name: string; value: number }> }) => (
  <>
    <ResponsiveContainer width="100%" height={200}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RechartsPieChart>
    </ResponsiveContainer>
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {data.map((item, index) => (
        <AdminBadge key={item.name} variant="outline" size="sm">
          <span
            className="w-2 h-2 rounded-full ml-1"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
          />
          {item.name}: {item.value}
        </AdminBadge>
      ))}
    </div>
  </>
);
