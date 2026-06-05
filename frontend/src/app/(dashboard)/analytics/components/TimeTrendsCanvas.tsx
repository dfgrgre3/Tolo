'use client';

/**
 * TimeTrendsCanvas
 * ----------------
 * Same pattern as WeeklyChartCanvas: this is the only file in the analytics
 * page that statically imports `chart.js` and `react-chartjs-2`. It is
 * loaded lazily by TimeTrends.tsx via next/dynamic with `ssr: false` so the
 * chart.js library is NOT in the main bundle.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface TimeTrendsCanvasProps {
  // Pre-formatted day data with Arabic labels (formatted by the parent so
  // we don't pull in date-fns / `ar` locale on this chunk).
  days: Array<{ shortLabel: string; minutes: number }>;
  firstAvg: number;
}

export default function TimeTrendsCanvas({ days, firstAvg }: TimeTrendsCanvasProps) {
  const lineChartData = {
    labels: days.map((d) => d.shortLabel),
    datasets: [
      {
        label: 'وقت المذاكرة (دقائق)',
        data: days.map((d) => d.minutes),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'المتوسط',
        data: days.map(() => firstAvg),
        borderColor: 'rgba(156, 163, 175, 0.5)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  return (
    <div className="h-96">
      <Line
        data={lineChartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const minutes = ctx.parsed.y ?? 0;
                  if (ctx.datasetIndex === 0) {
                    const hours = (minutes / 60).toFixed(1);
                    return `${ctx.dataset.label}: ${minutes} دقيقة (${hours} ساعة)`;
                  }
                  return `${ctx.dataset.label}: ${minutes.toFixed(1)} دقيقة`;
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
  );
}
