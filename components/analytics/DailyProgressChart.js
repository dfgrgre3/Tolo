import React from 'react';

export const DailyProgressChart = React.memo(({ chartData }) => {
  if (!chartData || chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا تتوفر بيانات لعرض الرسم البياني.</div>;
  }

  const width = 600;
  const height = 180;
  const padding = 25;
  const fixedMin = 50;
  const fixedMax = 100;
  const rangeY = fixedMax - fixedMin;

  const scaleX = (index) => (index / (chartData.length - 1)) * (width - 2 * padding) + padding;
  const scaleY = (value) => {
    const normalizedValue = (value - fixedMin) / rangeY;
    return height - padding - (normalizedValue * (height - 2 * padding));
  };

  const points = chartData.map((d, i) => {
    const x = scaleX(i);
    const y = scaleY(d.progress);
    return `${x},${y}`;
  }).join(' L ');

  const lastIndex = chartData.length - 1;
  const lastPoint = chartData[lastIndex];
  const lastX = scaleX(lastIndex);
  const lastY = scaleY(lastPoint.progress);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg mb-6">
      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 text-right border-b pb-2 border-gray-100 dark:border-gray-700">
        أداء التقدم خلال آخر 7 وحدات
      </h3>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '300px' }}>
          <defs>
            <linearGradient id="progressGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {[100, 90, 80, 70, 60, 50].map((value, i) => {
            const y = scaleY(value);
            return (
              <React.Fragment key={value}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                  className="dark:fill-gray-400"
                >
                  {value}%
                </text>
              </React.Fragment>
            );
          })}

          <path
            d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
            fill="url(#progressGradient)"
            className="transition-all duration-1000 ease-out"
          />
          <path 
            d={`M ${points}`} 
            fill="none" 
            stroke="#4f46e5" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out"
          />

          {chartData.map((d, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleY(d.progress)}
              r={4}
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="2"
              className="dark:stroke-gray-800 transition-all duration-1000 ease-out"
            />
          ))}
          {chartData.map((d, i) => (
            <text
              key={`label-${i}`}
              x={scaleX(i)}
              y={height - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#4b5563"
              className="dark:fill-gray-300"
            >
              {d.day}
            </text>
          ))}

          <text
            x={lastX}
            y={lastY - 10}
            textAnchor="middle"
            fontWeight="extrabold"
            fontSize="14"
            fill="#4f46e5"
            className="dark:fill-indigo-400"
          >
            {`${lastPoint.progress}%`}
          </text>
        </svg>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        ملاحظة: هذا الرسم البياني يمثل تطورك على مدار آخر سبع وحدات دراسية أو أيام.
      </p>
    </div>
  );
});

export default DailyProgressChart;