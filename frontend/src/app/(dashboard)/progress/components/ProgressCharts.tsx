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

export function SkillRadarChart({ subjectSkills }: { subjectSkills: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={400} minWidth={280} minHeight={320}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectSkills}>
        <PolarGrid stroke="rgba(255,255,255,0.05)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(156,163,175,0.8)', fontSize: 14 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="مستوى المهارة"
          dataKey="level"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.4}
        />
        <RechartsTooltip contentStyle={{ background: '#000', border: '1px solid #333' }} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ActivityAreaChart({ studyStats, CustomTooltip }: { studyStats: any[], CustomTooltip: React.ComponentType<any> }) {
  return (
    <ResponsiveContainer width="100%" height={350} minWidth={280} minHeight={280}>
      <AreaChart data={studyStats}>
        <defs>
          <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMin)" />
        <Line type="monotone" dataKey="target" stroke="rgba(245,158,11,0.3)" strokeDasharray="5 5" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthLineChart({ progressPath }: { progressPath: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={350} minWidth={280} minHeight={280}>
      <LineChart data={progressPath}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
        <RechartsTooltip />
        <Line
          type="stepAfter"
          dataKey="xp"
          stroke="#10b981"
          strokeWidth={4}
          dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#000' }}
          activeDot={{ r: 8, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
