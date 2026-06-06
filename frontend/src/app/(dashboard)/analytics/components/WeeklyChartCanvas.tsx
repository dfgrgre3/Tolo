'use client';

/**
 * WeeklyChartCanvas
 * -----------------
 * Converted to Recharts for lighter bundle footprint and cleaner integration.
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: { date: string | Date; minutes: number }[];
};

interface WeeklyChartCanvasProps {
  weekly: WeeklyData;
}

const COLORS = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(236, 72, 153, 0.8)',
];

export default function WeeklyChartCanvas({ weekly }: WeeklyChartCanvasProps) {
  const subjectData = useMemo(() => {
    const subjects = Object.keys(weekly.bySubject || {});
    return subjects.map((name, index) => ({
      name,
      minutes: weekly.bySubject[name],
      fill: COLORS[index % COLORS.length]
    }));
  }, [weekly]);

  const dayData = useMemo(() => {
    return (weekly.byDay || []).map((d) => ({
      name: String(d.date),
      minutes: d.minutes
    }));
  }, [weekly]);

  const formatTooltip = (value: any) => {
    const minutes = Number(value);
    const hours = (minutes / 60).toFixed(1);
    return [`${minutes} دقيقة (${hours} ساعة)`, 'وقت المذاكرة'];
  };

  return (
    <>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={subjectData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v} د`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={formatTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
              {subjectData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dayData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v} د`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={formatTooltip} />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="rgb(16, 185, 129)"
              strokeWidth={3}
              dot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: 'rgb(16, 185, 129)' }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
