"use client";

import React, { useMemo, useId } from 'react';

interface DailyProgressChartProps {
  chartData: Array<{
    day: string;
    progress: number;
  }>;
  /** عرض الرسم البياني الافتراضي 600 */
  width?: number;
  /** ارتفاع الرسم البياني الافتراضي 180 */
  height?: number;
  /** الهامش الداخلي الافتراضي متناسب مع الأبعاد */
  padding?: number;
  /** لون الخط والتدرج الافتراضي #8b5cf6 */
  primaryColor?: string;
  /** عنوان الرسم البياني */
  title?: string;
  /** نص الملاحظة السفلية */
  footnote?: string;
}

export const DailyProgressChart = React.memo(({
  chartData,
  width = 600,
  height = 180,
  padding,
  primaryColor = "#8b5cf6",
  title = "تطور المستوى القتالي",
  footnote = "ملاحظة: هذا الرسم البياني يمثل تطور مهاراتك القتالية في آخر 7 مهام.",
}: DailyProgressChartProps) => {

  const gradientId = useId();
  // هامش متناسب ديناميكياً مع الأبعاد إذا لم يُمرر صراحةً
  const effectivePadding = padding ?? Math.min(width, height) * 0.12;

  const computedValues = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    // ✅ توحيد تنظيف البيانات مرة واحدة فقط
    const cleanedData = chartData.map(d => ({
      day: d.day,
      progress: typeof d.progress === 'number' && !isNaN(d.progress) ? d.progress : 0,
    }));

    const progressValues = cleanedData.map(d => d.progress);
    const dataMin = Math.min(...progressValues);
    const dataMax = Math.max(...progressValues);
    const range = dataMax - dataMin || 1;
    const margin = range * 0.05;

    const minY = Math.floor(dataMin - margin);
    const maxY = Math.ceil(dataMax + margin);
    const rangeY = maxY - minY;

    // ✅ معالجة حالة النقطة الواحدة: توسيطها أفقياً
    const scaleX = (index: number) => {
      if (cleanedData.length === 1) return width / 2;
      const divisor = cleanedData.length - 1;
      return (index / divisor) * (width - 2 * effectivePadding) + effectivePadding;
    };

    const scaleY = (value: number) => {
      const normalizedValue = (value - minY) / rangeY;
      return height - effectivePadding - normalizedValue * (height - 2 * effectivePadding);
    };

    const points = cleanedData
      .map((d, i) => `${scaleX(i)},${scaleY(d.progress)}`)
      .join(' L ');

    const lastIndex = cleanedData.length - 1;
    const lastPoint = cleanedData[lastIndex]!;
    const lastX = scaleX(lastIndex);
    const lastY = scaleY(lastPoint.progress);

    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const value = minY + (rangeY * i) / 4;
      return { value: Math.round(value), y: scaleY(value) };
    });

    return {
      cleanedData,
      maxX: width - effectivePadding,
      scaleX,
      scaleY,
      points,
      lastX,
      lastY,
      lastProgress: lastPoint.progress,
      gridLines,
    };
  }, [chartData, width, height, effectivePadding]);

  // حالة عدم وجود بيانات
  if (!computedValues) {
    return (
      <div className="w-full bg-black/20 rounded-xl p-4 border border-white/10 shadow-lg mb-6 backdrop-blur-md">
        <h3 className="text-lg font-bold text-gray-200 mb-4 text-right border-b pb-2 border-white/10 flex items-center justify-end gap-2">
          <span>{title}</span>
        </h3>
        <div className="text-center py-8 text-gray-400" role="status">
          لا تتوفر بيانات لعرض الرسم البياني.
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">{footnote}</p>
      </div>
    );
  }

  const { cleanedData, maxX, scaleX, scaleY, points, lastX, lastY, lastProgress, gridLines } = computedValues;

  return (
    <div className="w-full bg-black/20 rounded-xl p-4 border border-white/10 shadow-lg mb-6 backdrop-blur-md">
      <h3 className="text-lg font-bold text-gray-200 mb-4 text-right border-b pb-2 border-white/10 flex items-center justify-end gap-2">
        <span>{title}</span>
      </h3>

      {/* جدول مخفي لإمكانية الوصول */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">اليوم</th>
            <th scope="col">التقدم (%)</th>
          </tr>
        </thead>
        <tbody>
          {cleanedData.map((d, i) => (
            <tr key={i}>
              <td>{d.day}</td>
              <td>{d.progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: '300px' }}
          role="img"
          aria-labelledby={`${gradientId}-title ${gradientId}-desc`}
        >
          <title id={`${gradientId}-title`}>{title}</title>
          <desc id={`${gradientId}-desc`}>
            رسم بياني خطي يعرض تطور التقدم عبر {cleanedData.length} أيام.
            أحدث قيمة هي {lastProgress}%.
          </desc>

          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* خطوط الشبكة والمحور Y */}
          {gridLines.map((line) => (
            <React.Fragment key={line.value}>
              <line
                x1={effectivePadding}
                y1={line.y}
                x2={maxX}
                y2={line.y}
                stroke="#ffffff"
                strokeOpacity="0.1"
                strokeDasharray="4 4"
              />
              <text
                x={effectivePadding - 10}
                y={line.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#d1d5db"
              >
                {line.value}%
              </text>
            </React.Fragment>
          ))}

          {/* المنطقة تحت الخط */}
          <path
            d={`M ${effectivePadding},${height - effectivePadding} L ${points} L ${maxX},${height - effectivePadding} Z`}
            fill={`url(#${gradientId})`}
            className=""
          />

          {/* الخط الرئيسي */}
          <path
            d={`M ${points}`}
            fill="none"
            stroke={primaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className=" drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          />

          {/* ✅ نقاط البيانات مع إمكانية وصول فردية */}
          {cleanedData.map((d, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleY(d.progress)}
              r={4}
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="2"
              className=""
              role="graphics-symbol"
              aria-label={`${d.day}: ${d.progress}%`}
            >
              <title>{`${d.day}: ${d.progress}%`}</title>
            </circle>
          ))}

          {/* تسميات المحور X */}
          {cleanedData.map((d, i) => (
            <text
              key={`label-${i}`}
              x={scaleX(i)}
              y={height - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#e5e7eb"
            >
              {d.day}
            </text>
          ))}

          {/* تسمية النقطة الأخيرة */}
          <text
            x={lastX}
            y={lastY - 10}
            textAnchor="middle"
            fontWeight="extrabold"
            fontSize="14"
            fill={primaryColor}
            filter="drop-shadow(0 0 2px rgba(0,0,0,0.8))"
          >
            {`${lastProgress}%`}
          </text>
        </svg>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        {footnote}
      </p>
    </div>
  );
});

DailyProgressChart.displayName = 'DailyProgressChart';

export default DailyProgressChart;