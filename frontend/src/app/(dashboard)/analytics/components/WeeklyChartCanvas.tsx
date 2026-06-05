'use client';

/**
 * WeeklyChartCanvas
 * -----------------
 * This file is the ONLY place in the analytics page that imports
 * `chart.js` and `react-chartjs-2` statically. It is loaded lazily via
 * `next/dynamic({ ssr: false })` from WeeklyChart.tsx so that the ~200KB
 * chart.js library is NOT pulled into the main bundle of the analytics
 * page (and definitely not into the login / dashboard landing pages).
 *
 * Loading this file on the client registers the required Chart.js
 * controllers/scales, then renders <Bar/> and <Line/> for the
 * subjects-by-time and days-by-time datasets.
 */

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  ArcElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  ArcElement
);

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
  // All the data prep is done here so the parent stays free of chart.js.
  const subjectChartData = useMemo(
    () => ({
      labels: Object.keys(weekly.bySubject || {}),
      datasets: [
        {
          label: 'دقائق',
          data: Object.values(weekly.bySubject || {}),
          backgroundColor: COLORS,
          borderColor: COLORS.map((c) => c.replace('0.8', '1')),
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    }),
    [weekly]
  );

  // Day labels are kept raw here (i.e. ISO strings) — the parent decides
  // how to format them so we don't pull in date-fns / ar locale on the
  // main bundle path. The parent passes pre-formatted labels.
  const dayChartData = useMemo(
    () => ({
      labels: (weekly.byDay || []).map((d) => String(d.date)),
      datasets: [
        {
          label: 'دقائق',
          data: (weekly.byDay || []).map((d) => d.minutes),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.3)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    }),
    [weekly]
  );

  return (
    <>
      <div className="h-80">
        <Bar
          data={subjectChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const minutes = ctx.parsed.y ?? 0;
                    const hours = (minutes / 60).toFixed(1);
                    return `${minutes} دقيقة (${hours} ساعة)`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => `${v} د` },
              },
            },
          }}
        />
      </div>
      <div className="h-80">
        <Line
          data={dayChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const minutes = ctx.parsed.y ?? 0;
                    const hours = (minutes / 60).toFixed(1);
                    return `${minutes} دقيقة (${hours} ساعة)`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => `${v} د` },
              },
            },
          }}
        />
      </div>
    </>
  );
}
