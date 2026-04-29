"use client";

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { m } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  data: any[];
  title: string;
  label: string;
  color?: string;
}

export function RealTimePerformanceChart({ data, title, label, color = '#EAB308' }: Props) {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [
      {
        label: label,
        data: data.map(d => d.value),
        fill: true,
        borderColor: color,
        backgroundColor: `${color}20`,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#000000',
        titleFont: { size: 10 },
        bodyFont: { size: 12, weight: 'bold' as any },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 },
          callback: (value: any) => `${value}ms`,
        },
      },
    },
  };

  return (
    <div className="w-full h-full p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">{title}</h3>
        <span className="text-[10px] font-bold text-green-500 animate-pulse">LIVE</span>
      </div>
      <div className="flex-1 min-h-0">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
