"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * بيانات نقطة في الرسم البياني
 */
export interface ChartDataPoint {
  /** اليوم أو التاريخ */
  day: string;
  /** نسبة التقدم (0-100) */
  progress: number;
  /** تفاصيل إضافية اختيارية */
  details?: string;
}

/**
 * ألوان السمة للرسم البياني
 */
export interface ThemeColors {
  /** لون السمة الفاتحة */
  light: string;
  /** لون السمة الداكنة */
  dark: string;
}

/**
 * خصائص مكون الرسم البياني
 */
export interface DailyProgressChartProps {
  /** بيانات الرسم البياني */
  chartData: ChartDataPoint[];
  /** وضع العرض: أسبوعي أو شهري */
  mode?: 'weekly' | 'monthly';
  /** ألوان السمة */
  themeColors?: ThemeColors;
}

/**
 * مكون الرسم البياني اليومي للتقدم
 * 
 * يعرض تقدم المستخدم على مدار فترة زمنية محددة
 * مع إمكانية التفاعل والتصدير
 * 
 * @example
 * ```tsx
 * <DailyProgressChart 
 *   chartData={[
 *     { day: 'السبت', progress: 75 },
 *     { day: 'الأحد', progress: 85 }
 *   ]}
 *   mode="weekly"
 * />
 * ```
 */
export const DailyProgressChart = React.memo<DailyProgressChartProps>(({ 
  chartData,
  mode = 'weekly',
  themeColors = {
    light: '#4f46e5',
    dark: '#818cf8'
  }
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * تصدير الرسم البياني كصورة PNG
   */
  const exportChart = async (): Promise<void> => {
    if (chartRef.current) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(chartRef.current);
        const link = document.createElement('a');
        link.download = 'progress-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('فشل تصدير الرسم البياني:', error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [chartData]);

  // التحقق من صحة البيانات
  if (!Array.isArray(chartData) || chartData.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg mb-6"
        ref={chartRef}
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          لا تتوفر بيانات لعرض الرسم البياني.
        </div>
      </motion.div>
    );
  }

  // إعدادات الرسم البياني
  const width = 600;
  const height = 180;
  const padding = 25;
  const fixedMin = 50;
  const fixedMax = 100;
  const rangeY = fixedMax - fixedMin;

  /**
   * حساب موقع X للنقطة
   */
  const scaleX = (index: number): number => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    return (index / divisor) * (width - 2 * padding) + padding;
  };

  /**
   * حساب موقع Y للقيمة
   */
  const scaleY = (value: number): number => {
    const normalizedValue = (value - fixedMin) / rangeY;
    return height - padding - (normalizedValue * (height - 2 * padding));
  };

  // إنشاء نقاط المسار
  const points = chartData
    .map((d, i) => {
      const x = scaleX(i);
      const y = scaleY(d.progress);
      return `${x},${y}`;
    })
    .join(' L ');

  // النقطة الأخيرة
  const lastIndex = chartData.length - 1;
  const lastPoint = chartData[lastIndex];
  const lastX = scaleX(lastIndex);
  const lastY = scaleY(lastPoint.progress);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg mb-6"
      ref={chartRef}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 border-b pb-2 border-gray-100 dark:border-gray-700">
          أداء التقدم خلال آخر {mode === 'weekly' ? '7 أيام' : '30 يومًا'}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={exportChart}
            className="px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
            aria-label="تصدير الرسم البياني"
          >
            تصدير
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full" 
          preserveAspectRatio="xMidYMid meet" 
          style={{ minWidth: '300px' }}
          role="img"
          aria-label="رسم بياني لتقدم الأداء"
        >
          <defs>
            <linearGradient id="progressGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={themeColors.light} stopOpacity={0.3} />
              <stop offset="100%" stopColor={themeColors.light} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* خطوط الشبكة */}
          {[100, 90, 80, 70, 60, 50].map((value) => {
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

          {/* منطقة التعبئة */}
          <path
            d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
            fill="url(#progressGradient)"
            className="transition-all duration-1000 ease-out"
          />

          {/* خط الرسم البياني */}
          <path 
            d={`M ${points}`} 
            fill="none" 
            stroke={themeColors.light} 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* النقاط التفاعلية */}
          {chartData.map((d, i) => (
            <g key={d.day}>
              <circle
                cx={scaleX(i)}
                cy={scaleY(d.progress)}
                r={hoveredIndex === i ? 6 : 4}
                fill={hoveredIndex === i ? "#6366f1" : themeColors.light}
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:stroke-gray-800 transition-all duration-300 ease-out cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                role="button"
                tabIndex={0}
                aria-label={`${d.day}: ${d.progress}%`}
              />
              {hoveredIndex === i && (
                <foreignObject 
                  x={scaleX(i) - 50} 
                  y={scaleY(d.progress) - 50}
                  width="100" 
                  height="40"
                  className="z-10"
                >
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {d.day}: {d.progress}%
                    </p>
                    {d.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {d.details}
                      </p>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          ))}

          {/* تسميات المحور X */}
          {chartData.map((d, i) => (
            <text
              key={`label-${d.day}`}
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

          {/* قيمة النقطة الأخيرة */}
          <text
            x={lastX}
            y={lastY - 10}
            textAnchor="middle"
            fontWeight="extrabold"
            fontSize="14"
            fill={themeColors.light}
            className="dark:fill-indigo-400"
          >
            {`${lastPoint.progress}%`}
          </text>
        </svg>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        ملاحظة: هذا الرسم البياني يمثل تطورك على مدار آخر سبع وحدات دراسية أو أيام.
      </p>

      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-70 flex items-center justify-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"
              role="status"
              aria-label="جارٍ التحميل"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

DailyProgressChart.displayName = 'DailyProgressChart';

export default DailyProgressChart;
