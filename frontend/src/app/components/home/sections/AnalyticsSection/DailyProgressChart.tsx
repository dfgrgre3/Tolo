"use client";

import React from 'react';

interface DailyProgressChartProps {
  chartData: Array<{
    day: string;
    progress: number;
  }>;
}

export const DailyProgressChart = React.memo(({ chartData }: DailyProgressChartProps) => {
  if (!chartData || chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">لا تتوفر بيانات لعرض الرسم البياني.</div>;
  }

  // SVG Configuration and Scaling
  const width = 600;
  const height = 180;
  const padding = 25;

  const fixedMin = 50;
  const fixedMax = 100;
  const rangeY = fixedMax - fixedMin;

  const scaleX = (index: number) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    return (index / divisor) * (width - 2 * padding) + padding;
  };

  const scaleY = (value: number) => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : fixedMin;
    const normalizedValue = (safeValue - fixedMin) / (rangeY || 1);
    return height - padding - normalizedValue * (height - 2 * padding);
  };

  const points = chartData.map((d, i) => {
    const x = scaleX(i);
    const progress = typeof d.progress === 'number' && !isNaN(d.progress) ? d.progress : fixedMin;
    const y = scaleY(progress);
    return `${x},${y}`;
  }).join(' L ');

  const lastIndex = chartData.length - 1;
  const lastPoint = chartData[lastIndex] || { day: '', progress: fixedMin };
  const lastX = scaleX(lastIndex);
  const lastProgress = typeof lastPoint.progress === 'number' && !isNaN(lastPoint.progress) ? lastPoint.progress : fixedMin;
  const lastY = scaleY(lastProgress);

  return (
    <div className="w-full bg-black/20 rounded-xl p-4 border border-white/10 shadow-lg mb-6 backdrop-blur-md">
      <h3 className="text-lg font-bold text-gray-200 mb-4 text-right border-b pb-2 border-white/10 flex items-center justify-end gap-2">
        <span>تطور المستوى القتالي (Level History)</span>
      </h3>
      
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '300px' }}>
          {/* Gradient Definition for Area */}
          <defs>
            <linearGradient id="progressGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          {/* Y-Axis Grid Lines & Labels */}
          {[100, 90, 80, 70, 60, 50].map((value) => {
            const y = scaleY(value);
            return (
              <React.Fragment key={value}>
                {/* Grid Line */}
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />
              
                {/* Y Label */}
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {value}%
                </text>
              </React.Fragment>
            );
          })}
          
          {/* Area under the line */}
          <path
            d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
            fill="url(#progressGradient)"
            className="transition-all duration-1000 ease-out"
          />

          {/* The main line path */}
          <path
            d={`M ${points}`}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          />
          
          {/* Data Points */}
          {chartData.map((d, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleY(Number(d.progress) || fixedMin)}
              r={4}
              fill="#8b5cf6"
              stroke="#ffffff"
              strokeWidth="2"
              className="transition-all duration-1000 ease-out"
            />
          ))}

          {/* X-Axis Labels (Day/Unit Labels) */}
          {chartData.map((d, i) => (
            <text
              key={`label-${i}`}
              x={scaleX(i)}
              y={height - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#d1d5db"
            >
              {d.day}
            </text>
          ))}
          
          {/* Last Point Label (Current Value) */}
          <text
            x={lastX}
            y={lastY - 10}
            textAnchor="middle"
            fontWeight="extrabold"
            fontSize="14"
            fill="#a78bfa"
            filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))"
          >
            {`${lastPoint.progress}%`}
          </text>
        </svg>
      </div>
      
      <p className="text-xs text-gray-400 mt-4 text-center">
        ملاحظة: هذا الرسم البياني يمثل تطور مهاراتك القتالية في آخر 7 مهام.
      </p>
    </div>
  );
});

DailyProgressChart.displayName = 'DailyProgressChart';

export default DailyProgressChart;
