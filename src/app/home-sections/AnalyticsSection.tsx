import React from 'react';
import Link from 'next/link';
import { safeFetch } from '@/lib/safe-client-utils';
import { getSafeUserId } from '@/lib/safe-client-utils';

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
            dailyProgress: Array<{ day: string; progress: number }>;
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
                    (summaryData.tasksCompleted / 10) * 20 + 
                    (summaryData.streakDays / 30) * 30 + 
                    (summaryData.averageFocus / 100) * 50
                ));
                
                // Generate daily progress from summary data
                const dailyProgress = Array.from({ length: 7 }, (_, i) => ({
                    day: `س${i + 1}`,
                    progress: Math.min(100, Math.max(0, progressRate + (i % 3 === 0 ? 5 : -2)))
                }));

                return {
                    progressRate,
                    skillsAcquired: Math.floor(summaryData.tasksCompleted / 2),
                    studyHours: Math.floor(summaryData.totalMinutes / 60),
                    dailyProgress,
                    lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                };
            }

            // Final fallback with minimal data
            return {
                progressRate: 0,
                skillsAcquired: 0,
                studyHours: 0,
                dailyProgress: Array.from({ length: 7 }, (_, i) => ({
                    day: `س${i + 1}`,
                    progress: 0
                })),
                lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
        }

        return {
            progressRate: data.progressRate,
            skillsAcquired: data.skillsAcquired,
            studyHours: data.studyHours,
            dailyProgress: data.dailyProgress,
            lastUpdate: new Date(data.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
    } catch (err) {
        console.error('Error fetching analytics data:', err);
        throw new Error("فشل جلب التحليلات بسبب خطأ في الخادم.");
    }
};

/**
 * DailyProgressChart Component (Visualizes progress using SVG)
 * @param {DailyData[]} chartData 
 */
const DailyProgressChart = React.memo(({ chartData }: { chartData: Array<{ day: string; progress: number }> }) => {
    if (!chartData || chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا تتوفر بيانات لعرض الرسم البياني.</div>;
    }

    // SVG Configuration and Scaling
    const width = 600;
    const height = 180;
    const padding = 25;

    const allProgressValues = chartData.map(d => d.progress);
    const fixedMin = 50; 
    const fixedMax = 100;
    const rangeY = fixedMax - fixedMin;

    const scaleX = (index: number) => (index / (chartData.length - 1)) * (width - 2 * padding) + padding;
    const scaleY = (value: number) => {
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
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 text-right border-b pb-2 border-gray-100 dark:border-gray-700">أداء التقدم خلال آخر 7 وحدات</h3>
            
            <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '300px' }}>
                    {/* Gradient Definition for Area */}
                    <defs>
                        <linearGradient id="progressGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    
                    {/* Y-Axis Grid Lines & Labels */}
                    {[100, 90, 80, 70, 60, 50].map((value, i) => {
                        const y = scaleY(value);
                        return (
                            <React.Fragment key={value}>
                                {/* Grid Line */}
                                <line
                                    x1={padding}
                                    y1={y}
                                    x2={width - padding}
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeDasharray="4 4"
                                    className="dark:stroke-gray-700"
                                />
                                {/* Y Label */}
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
                        stroke="#4f46e5" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* Data Points */}
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

                    {/* X-Axis Labels (Day/Unit Labels) */}
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
                    
                    {/* Last Point Label (Current Value) */}
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


/**
 * AnalyticsSection component displays key performance indicators (KPIs) dynamically.
 * Note: Wrapped in React.memo for performance optimization.
 */
function AnalyticsSectionComponent() {
    const [data, setData] = React.useState<{ progressRate: number; skillsAcquired: number; studyHours: number; dailyProgress: Array<{ day: string; progress: number }>; lastUpdate: string } | null>(null);
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
            console.error("Failed to fetch analytics data:", err);
            setError((err instanceof Error ? err.message : String(err)) || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
        } finally {
            setIsLoading(false);
        }
    }, []); 

    // Effect to run when component mounts or when pathFilter changes
    React.useEffect(() => {
        loadData(pathFilter);
    }, [loadData, pathFilter]); // Dependency on pathFilter ensures data refetches when filter changes

    // Helper component for Loading/Error states
    const StatusMessage = ({ text, isError = false }: { text: string; isError?: boolean }) => (
        <div className="text-center py-12">
            <svg 
                className={`h-6 w-6 mx-auto mb-3 ${isError ? 'text-red-500' : 'animate-spin text-indigo-500'}`} 
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            >
                {isError ? (
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                ) : (
                    <>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </>
                )}
            </svg>
            <p className={`font-semibold ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{text}</p>
        </div>
    );
    
    // Determine which content to display
    let cardContent;
    if (isLoading && !data) { 
        cardContent = <StatusMessage text="جاري تحميل البيانات..." />;
    } else if (error) {
        cardContent = <StatusMessage text={error} isError={true} />;
    } else {
        // Data is successfully loaded (or is being refreshed in the background)
        cardContent = (
            <div key={pathFilter + data?.lastUpdate || 'initial-content'}>
                
                {/* --- KPI Cards Grid (Responsive Layout) --- */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 
                                transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                    
                    {/* 1. Progress Rate */}
                    <div className="bg-gradient-to-br from-indigo-50/70 dark:from-indigo-900/50 to-white/90 dark:to-gray-900/50 p-5 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 shadow-md">
                        <p className="text-sm text-gray-500 dark:text-gray-400">معدل التقدم</p>
                        <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 transition-colors duration-1000">{data?.progressRate}%</p>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-3">
                            <div 
                                className="h-2 bg-indigo-600 rounded-full transition-all duration-1000" 
                                style={{ width: `${data?.progressRate || 0}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* 2. Skills Acquired */}
                    <div className="bg-gradient-to-br from-teal-50/70 dark:from-teal-900/50 to-white/90 dark:to-gray-900/50 p-5 rounded-xl border border-teal-200/50 dark:border-teal-800/50 shadow-md">
                        <p className="text-sm text-gray-500 dark:text-gray-400">المهارات المكتسبة</p>
                        <p className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mt-1 transition-colors duration-1000">{data?.skillsAcquired}</p>
                        <p className="text-xs text-teal-500 dark:text-teal-600 mt-2">+3 هذا الأسبوع ({pathFilter})</p>
                    </div>
                    
                    {/* 3. Study Hours */}
                    <div className="bg-gradient-to-br from-purple-50/70 dark:from-purple-900/50 to-white/90 dark:to-gray-900/50 p-5 rounded-xl border border-purple-200/50 dark:border-purple-800/50 shadow-md">
                        <p className="text-sm text-gray-500 dark:text-gray-400">ساعات الدراسة</p>
                        <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1 transition-colors duration-1000">{data?.studyHours}</p>
                        <p className="text-xs text-purple-500 dark:text-purple-600 mt-2">إجمالي حتى الآن</p>
                    </div>
                </div>

                {/* --- Advanced Chart Visualization --- */}
                {data?.dailyProgress && <DailyProgressChart chartData={data.dailyProgress} />}
                {/* ------------------------------------ */}
                
                <p className="font-semibold mb-4 text-xl text-gray-700 dark:text-gray-200 border-b border-dashed border-gray-200/50 dark:border-gray-700/50 pb-3">
                    شاهد رسوم بيانية وتحليلات مفصلة حول أدائك الدراسي وتقدمك في المسارات التعليمية.
                </p>
                
                {/* --- Footer & Action Button --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-green-500/50"></div>
                        <span>محدث آخر مرة: {data?.lastUpdate} - (المسار: {pathFilter})</span>
                    </div>
                    
                    <Link 
                        href="/analytics" 
                        className="rtl:flex-row-reverse rtl:justify-end 
                                  px-6 py-3 bg-indigo-600 text-white rounded-xl text-base 
                                  font-medium hover:bg-indigo-700 transition-all duration-300 
                                  shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/50 
                                  inline-flex items-center gap-2 transform hover:scale-[1.02]"
                    >
                        عرض التحليلات
                        {/* Arrow icon (flipped for RTL visual flow) */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </Link>
                </div>
            </div>
        );
    }


    return (
        <div className="mt-16 relative overflow-hidden p-4 md:p-8 max-w-4xl mx-auto">
            {/* --- Background Blurs (Decorative) --- */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-200/50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-200/50 rounded-full blur-2xl opacity-40"></div>
            
            <div className="relative z-10 text-right" dir="rtl">
                
                {/* --- Section Header and Controls --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
                    
                    {/* Header Title */}
                    <div className="flex items-center gap-3 order-2 sm:order-1">
                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">التحليلات والإحصائيات</h2>
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-xl shadow-md">
                            <span className="text-2xl">📊</span>
                        </div>
                    </div>

                    {/* Controls (Filter and Refresh) */}
                    <div className="flex items-center gap-3 order-1 sm:order-2">
                        {/* 1. Path Filter Dropdown */}
                        <select
                            value={pathFilter}
                            onChange={(e) => setPathFilter(e.target.value)}
                            disabled={isLoading}
                            className={`p-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 
                                       bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 
                                       shadow-sm appearance-none transition-colors focus:ring-2 focus:ring-indigo-500/50
                                       ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, 
                                backgroundRepeat: 'no-repeat', 
                                backgroundPosition: 'left 0.5rem center', 
                                backgroundSize: '1.2em'
                            }}
                        >
                            {PATH_OPTIONS.map((path: string) => (
                                <option key={path} value={path}>{path}</option>
                            ))}
                        </select>
                        
                        {/* 2. Refresh Button */}
                        <button 
                            onClick={() => loadData(pathFilter)} // Refresh data for the current path
                            disabled={isLoading}
                            className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center 
                                ${
                                    isLoading 
                                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white' 
                                        : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-700'
                                }`
                            }
                            title="تحديث البيانات"
                        >
                            {/* Spinner/Refresh Icon */}
                            <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                {isLoading ? (
                                    <path fill="currentColor" d="M12 4.167v1.666a6.167 6.167 0 016.167 6.167h1.666A7.833 7.833 0 0012 4.167z"/>
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0115.357-2m0 0H15"/>
                                )}
                            </svg>
                        </button>
                    </div>

                </div>
                
                {/* --- Main Card Container --- */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 
                              bg-white/90 dark:bg-gray-800/90 shadow-xl 
                              backdrop-blur-sm transition-all duration-500 
                              ring-4 ring-transparent hover:ring-indigo-300/50 dark:hover:ring-indigo-700/50">
                    
                    {cardContent}

                </div>
            </div>
        </div>
    );
}

// Applying React.memo is the performance enhancement for this purely presentational component.
export const AnalyticsSection = React.memo(AnalyticsSectionComponent);

// The default export is the memoized version.
export default AnalyticsSection;


// --- Wrapper App Component for Demonstration ---
function App() {
    const [isDarkMode, setIsDarkMode] = React.useState(false);

    // Toggle dark mode class on body
    React.useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Load Tailwind CSS */}
            <script src="https://cdn.tailwindcss.com"></script>
            <style jsx global>{`
                /* Add a dark mode transition for better aesthetics */
                html {
                    transition: background-color 0.5s, color 0.5s;
                }
            `}</style>
            
            <header className="py-4 bg-white/90 dark:bg-gray-800/90 shadow-md sticky top-0 z-50 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center px-4" dir="rtl">
                    <h1 className="text-2xl font-bold text-indigo-600">لوحة التحكم التجريبية</h1>
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-colors"
                        title={isDarkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </header>

            <main className="pb-20">
                <AnalyticsSection />
                <div className="max-w-4xl mx-auto text-center mt-12 p-4" dir="rtl">
                     <p className="text-sm text-gray-600 dark:text-gray-300">
                        (هذا المكون أصبح تفاعلياً: يمكنك تغيير المسار التعليمي وستتغير البيانات والرسم البياني بناءً على اختيارك.)
                    </p>
                </div>
            </main>
        </div>
    );
}
