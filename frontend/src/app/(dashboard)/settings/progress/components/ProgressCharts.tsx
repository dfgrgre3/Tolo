'use client';

import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";

// Chart colors are pulled from the site's real design tokens (--chart-1,
// --chart-2, --border, --muted-foreground, --popover, ...) instead of
// hardcoded hex/rgba values, so the charts follow light/dark theme changes
// instead of assuming a permanently dark background.
const CHART_PRIMARY = "hsl(var(--chart-1))";
const CHART_SECONDARY = "hsl(var(--chart-4))";
const GRID_STROKE = "hsl(var(--border))";
const AXIS_TICK_FILL = "hsl(var(--muted-foreground))";

export function SkillRadarChart({ subjectSkills }: { subjectSkills: Array<{ subject: string; level: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={400} minWidth={280} minHeight={320}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectSkills}>
        <PolarGrid stroke={GRID_STROKE} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: AXIS_TICK_FILL, fontSize: 14 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="مستوى المهارة"
          dataKey="level"
          stroke={CHART_PRIMARY}
          fill={CHART_PRIMARY}
          fillOpacity={0.4}
        />
        <RechartsTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }} />
        <Legend wrapperStyle={{ color: AXIS_TICK_FILL }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ActivityAreaChart({ studyStats, CustomTooltip }: { studyStats: Array<{ day: string; minutes: number; target: number }>, CustomTooltip: React.ComponentType<any> }) {
  return (
    <ResponsiveContainer width="100%" height={350} minWidth={280} minHeight={280}>
      <AreaChart data={studyStats}>
        <defs>
          <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="minutes" stroke={CHART_PRIMARY} strokeWidth={3} fillOpacity={1} fill="url(#colorMin)" />
        <Line type="monotone" dataKey="target" stroke={CHART_SECONDARY} strokeOpacity={0.6} strokeDasharray="5 5" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthLineChart({ progressPath }: { progressPath: Array<{ month: string; xp: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={350} minWidth={280} minHeight={280}>
      <LineChart data={progressPath}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} />
        <RechartsTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }} />
        <Line
          type="stepAfter"
          dataKey="xp"
          stroke="hsl(var(--chart-3))"
          strokeWidth={4}
          dot={{ fill: 'hsl(var(--chart-3))', r: 6, strokeWidth: 2, stroke: 'hsl(var(--popover))' }}
          activeDot={{ r: 8, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
