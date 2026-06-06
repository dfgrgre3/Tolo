'use client';

/**
 * SubjectDistributionCanvas
 * --------------------------
 * Converted to Recharts for lighter bundle footprint and cleaner integration.
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface SubjectDistributionCanvasProps {
  subjects: Array<{ name: string; minutes: number; hours: number }>;
  colors: string[];
}

export default function SubjectDistributionCanvas({
  subjects,
  colors,
}: SubjectDistributionCanvasProps) {
  // Format data for Recharts
  const data = subjects.map((s, index) => ({
    name: s.name,
    hours: s.hours,
    minutes: s.minutes,
    fill: colors[index % colors.length]
  }));

  const formatBarTooltip = (value: any) => {
    const hours = Number(value);
    const minutes = hours * 60;
    return [`${hours.toFixed(1)} ساعة (${Math.round(minutes)} دقيقة)`, 'ساعات'];
  };

  const formatPieTooltip = (value: any, name: any) => {
    const minutes = Number(value);
    const hours = minutes / 60;
    const totalMinutes = subjects.reduce((sum, s) => sum + s.minutes, 0);
    const percentage = totalMinutes > 0 ? ((minutes / totalMinutes) * 100).toFixed(1) : '0.0';
    return [`${hours.toFixed(1)} ساعة (${percentage}%)`, name];
  };

  return (
    <>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v} س`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={formatBarTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={formatPieTooltip} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
