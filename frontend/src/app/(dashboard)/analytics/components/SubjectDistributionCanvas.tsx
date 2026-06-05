'use client';

/**
 * SubjectDistributionCanvas
 * --------------------------
 * The ONLY place in the analytics page that statically imports
 * `chart.js` and `react-chartjs-2` for the subject distribution chart.
 * Loaded lazily by SubjectDistribution.tsx via next/dynamic with
 * `ssr: false` so the ~200KB chart.js library is NOT in the main bundle.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface SubjectDistributionCanvasProps {
  subjects: Array<{ name: string; minutes: number; hours: number }>;
  colors: string[];
}

export default function SubjectDistributionCanvas({
  subjects,
  colors,
}: SubjectDistributionCanvasProps) {
  const barChartData = {
    labels: subjects.map((s) => s.name),
    datasets: [
      {
        label: 'ساعات',
        data: subjects.map((s) => s.hours),
        backgroundColor: colors.slice(0, subjects.length),
        borderColor: colors
          .slice(0, subjects.length)
          .map((c) => c.replace('0.8', '1')),
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const doughnutChartData = {
    labels: subjects.map((s) => s.name),
    datasets: [
      {
        data: subjects.map((s) => s.minutes),
        backgroundColor: colors.slice(0, subjects.length),
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  return (
    <>
      <div className="h-80">
        <Bar
          data={barChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const hours = ctx.parsed.y ?? 0;
                    const minutes = hours * 60;
                    return `${hours.toFixed(1)} ساعة (${Math.round(minutes)} دقيقة)`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => `${v} س` },
              },
            },
          }}
        />
      </div>
      <div className="h-80">
        <Doughnut
          data={doughnutChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { padding: 15, usePointStyle: true },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const label = ctx.label || '';
                    const value = (ctx.parsed as number) || 0;
                    const hours = value / 60;
                    const total = (ctx.dataset.data as number[]).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${label}: ${hours.toFixed(1)} ساعة (${percentage}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </>
  );
}
