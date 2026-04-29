import React from 'react';
import Link from 'next/link';
import { safeFetch } from '@/lib/safe-client-utils';
import { getSafeUserId } from '@/lib/safe-client-utils';
import { logger } from '@/lib/logger';
import StatusMessage from '@/app/(dashboard)/analytics/components/StatusMessage';
import { rpgCommonStyles } from "../constants";
import { Sword, Scroll, Clock, Target, RefreshCw } from "lucide-react";

/**
 * @typedef {Object} DailyData
 * @property {string} day - اسم الوحدة أو اليوم (مثل س1، س2)
 * @property {number} progress - نسبة التقدم في ذلك اليوم
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {number} progressRate - معدل التقدم الحالي
 * @property {number} skillsAcquired - المهارات المكتسبة
 * @property {number} studyHours - ساعات الدراسة
 * @property {string} lastUpdate - وقت آخر تحديث
 * @property {DailyData[]} dailyProgress - بيانات التقدم على مدار 7 أيام/وحدات
 */

// Define the available paths for filtering
const PATH_OPTIONS = ['الكل', 'البرمجة', 'التصميم'];

/**
 * Function to fetch real analytics data from API based on the selected path filter.
 * @param {string} path - The selected study path (e.g., 'البرمجة').
 */
const fetchAnalyticsData = async (path: string) => {
  const userId = getSafeUserId();

  try {
    // Fetch analytics data from API
    const { data, error } = await safeFetch<{
      progressRate: number;
      skillsAcquired: number;
      studyHours: number;
      dailyProgress: Array<{day: string;progress: number;}>;
      timestamp: string;
    }>(
      `/api/analytics/weekly${userId ? `?userId=${userId}` : ''}${path !== 'الكل' ? `&path=${encodeURIComponent(path)}` : ''}`,
      undefined,
      null
    );

    if (error || !data) {
      // Fallback to progress summary if weekly analytics not available
      const { data: summaryData } = await safeFetch<{
        totalMinutes: number;
        averageFocus: number;
        tasksCompleted: number;
        streakDays: number;
      }>(
        `/api/progress/summary${userId ? `?userId=${userId}` : ''}`,
        undefined,
        null
      );

      if (summaryData) {
        // Calculate progress rate from summary
        const progressRate = Math.min(100, Math.round(
          summaryData.tasksCompleted / 10 * 20 +
          summaryData.streakDays / 30 * 30 +
          summaryData.averageFocus / 100 * 50
        ));

        // Generate daily progress from summary data
        const dailyProgress = Array.from({ length: 7 }, (_, i) => ({
          day: `Lvl ${i + 1}`,
          progress: Math.min(100, Math.max(0, progressRate + (i % 3 === 0 ? 5 : -2)))
        }));

        return {
          progressRate,
          skillsAcquired: Math.floor(summaryData.tasksCompleted / 2),
          studyHours: Math.floor(summaryData.totalMinutes / 60),
          dailyProgress,
          lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
      }

      // Final fallback with minimal data
      return {
        progressRate: 0,
        skillsAcquired: 0,
        studyHours: 0,
        dailyProgress: Array.from({ length: 7 }, (_, i) => ({
          day: `Lvl ${i + 1}`,
          progress: 0
        })),
        lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    }

    return {
      progressRate: data.progressRate,
      skillsAcquired: data.skillsAcquired,
      studyHours: data.studyHours,
      dailyProgress: data.dailyProgress,
      lastUpdate: new Date(data.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  } catch (err) {
    logger.error('Error fetching analytics data:', err);
    throw new Error("فشل جلب سجل المعارك بسبب خطأ في الخادم.");
  }
};

/**
 * DailyProgressChart Component (Visualizes progress using SVG)
 * @param {DailyData[]} chartData 
 */
const DailyProgressChart = React.memo(({ chartData }: {chartData: Array<{day: string;progress: number;}>;}) => {
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
                    {[100, 90, 80, 70, 60, 50].map((value, _i) => {
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
                  strokeDasharray="4 4" />
                
                                {/* Y Label */}
                                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9ca3af">
                  
                                    {value}%
                                </text>
                            </React.Fragment>);

          })}
                    
                    {/* Area under the line */}
                    <path
            d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
            fill="url(#progressGradient)"
            className="transition-all duration-1000 ease-out" />
          

                    {/* The main line path */}
                    <path
            d={`M ${points}`}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          
                    
                    {/* Data Points */}
                    {chartData.map((d, i) =>
          <circle
            key={i}
            cx={scaleX(i)}
            cy={scaleY(Number(d.progress) || fixedMin)}
            r={4}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth="2"
            className="transition-all duration-1000 ease-out" />

          )}

                    {/* X-Axis Labels (Day/Unit Labels) */}
                    {chartData.map((d, i) =>
          <text
            key={`label-${i}`}
            x={scaleX(i)}
            y={height - 5}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#d1d5db">
            
                            {d.day}
                        </text>
          )}
                    
                    {/* Last Point Label (Current Value) */}
                    <text
            x={lastX}
            y={lastY - 10}
            textAnchor="middle"
            fontWeight="extrabold"
            fontSize="14"
            fill="#a78bfa"
            filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))">
            
                        {`${lastPoint.progress}%`}
                    </text>
                </svg>
            </div>
            
            <p className="text-xs text-gray-400 mt-4 text-center">
                ملاحظة: هذا الرسم البياني يمثل تطور مهاراتك القتالية في آخر 7 مهام.
            </p>
        </div>);

});

DailyProgressChart.displayName = 'DailyProgressChart';


/**
 * AnalyticsSection component displays key performance indicators (KPIs) dynamically.
 * Note: Wrapped in React.memo for performance optimization.
 */
function AnalyticsSectionComponent() {
  const [data, setData] = React.useState<{progressRate: number;skillsAcquired: number;studyHours: number;dailyProgress: Array<{day: string;progress: number;}>;lastUpdate: string;} | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // NEW STATE: Filter for the study path
  const [pathFilter, setPathFilter] = React.useState('الكل');

  // Function to load/refresh data, memoized for stability
  const loadData = React.useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Pass the current filter to the data fetching function
      const fetchedData = await fetchAnalyticsData(path);
      setData(fetchedData);
    } catch (err) {
      logger.error("Failed to fetch analytics data:", err);
      setError((err instanceof Error ? err.message : String(err)) || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to run when component mounts or when pathFilter changes
  React.useEffect(() => {
    loadData(pathFilter);
  }, [loadData, pathFilter]); // Dependency on pathFilter ensures data refetches when filter changes



  // Determine which content to display
  let cardContent;
  if (isLoading && !data) {
    cardContent =
    <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
                    <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
                    <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
                </div>
                <div className="h-48 w-full rounded-xl bg-white/10 border border-white/5" />
                <div className="flex justify-between items-center mt-6">
                    <div className="h-4 w-48 bg-white/10 rounded" />
                    <div className="h-10 w-32 bg-white/10 rounded-xl" />
                </div>
            </div>;

  } else if (error) {
    cardContent = <StatusMessage text={error} isError={true} />;
  } else {
    // Data is successfully loaded (or is being refreshed in the background)
    cardContent =
    <div key={pathFilter + data?.lastUpdate || 'initial-content'}>
                
                {/* --- KPI Cards Grid (Responsive Layout) --- */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 
                                transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                    
                    {/* 1. Progress Rate */}
                    <div className={`${rpgCommonStyles.card} border-indigo-500/20 bg-indigo-500/10`}>
                        <div className="flex items-center gap-2 mb-2">
                             <Target className="h-5 w-5 text-indigo-400" />
                             <p className="text-sm text-gray-400">إتمام المهام (Quest Completion)</p>
                        </div>
                        <p className={`text-3xl font-extrabold ${rpgCommonStyles.neonText} mt-1`}>{isNaN(data?.progressRate ?? 0) ? 0 : (data?.progressRate ?? 0)}%</p>
                        <div className="h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
                            <div
              className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              style={{ width: `${data?.progressRate || 0}%` }}>
            </div>
                        </div>
                    </div>
                    
                    {/* 2. Skills Acquired */}
                    <div className={`${rpgCommonStyles.card} border-emerald-500/20 bg-emerald-500/10`}>
                        <div className="flex items-center gap-2 mb-2">
                             <Scroll className="h-5 w-5 text-emerald-400" />
                             <p className="text-sm text-gray-400">المهارات (XP Gained)</p>
                        </div>
                        <p className="text-3xl font-extrabold text-emerald-400 mt-1 transition-colors duration-1000 drop-shadow-md">{isNaN(data?.skillsAcquired ?? 0) ? 0 : (data?.skillsAcquired ?? 0)}</p>
                        <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                            <span className="text-lg">+</span> 3 مهارات جديدة هذا الأسبوع
                        </p>
                    </div>
                    
                    {/* 3. Study Hours */}
                    <div className={`${rpgCommonStyles.card} border-amber-500/20 bg-amber-500/10`}>
                        <div className="flex items-center gap-2 mb-2">
                             <Clock className="h-5 w-5 text-amber-400" />
                             <p className="text-sm text-gray-400">ساعات التدريب (Training)</p>
                        </div>
                        <p className={`text-3xl font-extrabold ${rpgCommonStyles.goldText} mt-1`}>{isNaN(data?.studyHours ?? 0) ? 0 : (data?.studyHours ?? 0)}</p>
                        <p className="text-xs text-amber-500 mt-2">إجمالي وقت اللعب</p>
                    </div>
                </div>

                {/* --- Advanced Chart Visualization --- */}
                {data?.dailyProgress && <DailyProgressChart chartData={data.dailyProgress} />}
                {/* ------------------------------------ */}
                
                <p className="font-semibold mb-4 text-xl text-gray-300 border-b border-dashed border-white/10 pb-3 flex items-center gap-2">
                    <Sword className="h-5 w-5 text-red-400" />
                    تقرير المعركة الأسبوعي (Battle Report)
                </p>
                
                {/* --- Footer & Action Button --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span>آخر تحديث للسيرفر: {data?.lastUpdate}</span>
                    </div>
                    
                    <Link
          href="/analytics"
          className={`rtl:flex-row-reverse rtl:justify-end 
                                  px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base 
                                  font-bold hover:bg-primary/90 transition-all duration-300 
                                  shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] 
                                  inline-flex items-center gap-2 transform hover:scale-105`}>
          
                        عرض السجلات الكاملة
                        {/* Arrow icon (flipped for RTL visual flow) */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>;

  }


  return (
    <div className={`mt-16 relative overflow-hidden p-4 md:p-8 max-w-5xl mx-auto rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl`}>
            {/* --- Background Blurs (Decorative) --- */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
            
            <div className="relative z-10 text-right" dir="rtl">
                
                {/* --- Section Header and Controls --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
                    
                    {/* Header Title */}
                    <div className="flex items-center gap-3 order-2 sm:order-1">
                        <h2 className={`text-3xl md:text-4xl font-black ${rpgCommonStyles.goldText}`}>إحصائيات البطل</h2>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                            <span className="text-2xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">📊</span>
                        </div>
                    </div>

                    {/* Controls (Filter and Refresh) */}
                    <div className="flex items-center gap-3 order-1 sm:order-2">
                        {/* 1. Path Filter Dropdown */}
                        <div className="relative">
                            <select
                value={pathFilter}
                onChange={(e) => setPathFilter(e.target.value)}
                disabled={isLoading}
                className={`p-2 pr-8 pl-4 rounded-lg border border-white/10 
                                           bg-black/40 text-gray-200 
                                           shadow-sm appearance-none transition-colors focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none 
                                           ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/5'}`}>
                
                                {PATH_OPTIONS.map((path: string) =>
                <option key={path} value={path} className="bg-slate-900 text-gray-200">{path}</option>
                )}
                            </select>
                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                        
                        {/* 2. Refresh Button */}
                        <button
              onClick={() => loadData(pathFilter)} // Refresh data for the current path
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center border border-white/10
                                ${
              isLoading ?
              'bg-white/5 cursor-not-allowed text-gray-500' :
              'bg-white/5 text-primary hover:bg-white/10 hover:shadow-[0_0_10px_rgba(124,58,237,0.2)]'}`

              }
              title="تحديث البيانات">
              
                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                </div>
                
                {/* --- Main Card Container --- */}
                <div className="relative z-10">
                    {cardContent}
                </div>
            </div>
        </div>);

}

// Applying React.memo is the performance enhancement for this purely presentational component.
export const AnalyticsSection = React.memo(AnalyticsSectionComponent);

// The default export is the memoized version.
export default AnalyticsSection;
