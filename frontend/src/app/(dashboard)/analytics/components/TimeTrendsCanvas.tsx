'use client';

/**
 * TimeTrendsCanvas
 * ----------------
 * Converted to Recharts for lighter bundle footprint and cleaner integration.
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface TimeTrendsCanvasProps {
  days: Array<{ shortLabel: string; minutes: number }>;
  firstAvg: number;
}

export default function TimeTrendsCanvas({ days, firstAvg }: TimeTrendsCanvasProps) {
  const data = useMemo(() => {
    return days.map((d) => ({
      name: d.shortLabel,
      minutes: d.minutes,
      average: firstAvg,
    }));
  }, [days, firstAvg]);

  const formatTooltip = (value: any, name: any) => {
    const minutes = Number(value);
    if (name === 'minutes') {
      const hours = (minutes / 60).toFixed(1);
      return [`${minutes} دقيقة (${hours} ساعة)`, 'وقت المذاكرة'];
    }
    return [`${minutes.toFixed(1)} دقيقة`, 'المتوسط'];
  };

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${v} د`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={formatTooltip} />
          <Legend verticalAlign="top" height={36} />
          <Line
            name="minutes"
            type="monotone"
            dataKey="minutes"
            stroke="rgb(59, 130, 246)"
            strokeWidth={3}
            dot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: 'rgb(59, 130, 246)' }}
            activeDot={{ r: 8 }}
          />
          <Line
            name="average"
            type="monotone"
            dataKey="average"
            stroke="rgba(156, 163, 175, 0.7)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
