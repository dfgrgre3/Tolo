'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler } from
"chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMounted } from '@/lib/safe-client-utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: {date: string | Date;minutes: number;}[];
};

interface TimeTrendsProps {
  weekly: WeeklyData | null;
}

export default function TimeTrends({ weekly }: TimeTrendsProps) {
  const isMounted = useIsMounted();

  const trendData = useMemo(() => {
    if (!weekly || !weekly.byDay) return null;

    const days = weekly.byDay.map((d, _idx) => {
      const date = new Date(d.date);
      return {
        date,
        label: format(date, 'EEEE', { locale: ar }),
        shortLabel: format(date, 'EEE', { locale: ar }),
        minutes: d.minutes,
        hours: d.minutes / 60
      };
    });

    // Calculate trends
    const firstHalf = days.slice(0, Math.floor(days.length / 2));
    const secondHalf = days.slice(Math.floor(days.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.minutes, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.minutes, 0) / secondHalf.length || 0;
    const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    const trendPercentage = firstAvg > 0 ?
    Math.abs((secondAvg - firstAvg) / firstAvg * 100) :
    0;

    // Find peak and low days
    const peakDay = days.length > 0 ?
    days.reduce((max, day) => day.minutes > max.minutes ? day : max, days[0]) :
    null;
    const lowDay = days.length > 0 ?
    days.reduce((min, day) => day.minutes < min.minutes ? day : min, days[0]) :
    null;

    return {
      days,
      trend,
      trendPercentage,
      firstAvg,
      secondAvg,
      peakDay,
      lowDay,
      totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0)
    };
  }, [weekly]);

  if (!trendData) {
    return (
      <Card>
				<CardContent className="p-6">
					<div className="text-center py-8 text-muted-foreground">
						<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>لا توجد بيانات للاتجاهات</p>
					</div>
				</CardContent>
			</Card>);

  }

  const lineChartData = {
    labels: trendData.days.map((d) => d.shortLabel),
    datasets: [
    {
      label: "وقت المذاكرة (دقائق)",
      data: trendData.days.map((d) => d.minutes),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    },
    {
      label: "المتوسط",
      data: trendData.days.map(() => trendData.firstAvg),
      borderColor: 'rgba(156, 163, 175, 0.5)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    }]

  };

  return (
    <div className="space-y-6">
			{/* Trend Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card className={`border-2 ${
        trendData.trend === 'up' ?
        'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' :
        trendData.trend === 'down' ?
        'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' :
        'border-gray-200 dark:border-gray-800'}`
        }>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">الاتجاه</p>
								<p className="text-2xl font-bold">
									{trendData.trend === 'up' ? 'تحسن' : trendData.trend === 'down' ? 'تراجع' : 'مستقر'}
								</p>
							</div>
							{trendData.trend === 'up' ?
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" /> :
              trendData.trend === 'down' ?
              <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" /> :

              <Activity className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              }
						</div>
					</CardContent>
				</Card>
				<Card className="border-blue-200 dark:border-blue-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">متوسط اليوم</p>
								<p className="text-2xl font-bold">
									{(trendData.firstAvg / 60).toFixed(1)} ساعة
								</p>
							</div>
							<Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-purple-200 dark:border-purple-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">أفضل يوم</p>
								<p className="text-2xl font-bold">{trendData.peakDay?.label || '-'}</p>
							</div>
							<Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-orange-200 dark:border-orange-800">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">التغيير</p>
								<p className={`text-2xl font-bold ${
                trendData.trend === 'up' ?
                'text-green-600 dark:text-green-400' :
                trendData.trend === 'down' ?
                'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'}`
                }>
									{trendData.trend === 'up' ? '+' : trendData.trend === 'down' ? '-' : ''}
									{trendData.trendPercentage.toFixed(1)}%
								</p>
							</div>
							<Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Trend Chart */}
			{isMounted &&
      <Card>
					<CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							اتجاه وقت المذاكرة خلال الأسبوع
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						<div className="h-96">
							<Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        if (context.datasetIndex === 0) {
                          const minutes = context.parsed.y ?? 0;
                          const hours = (minutes / 60).toFixed(1);
                          return `${context.dataset.label}: ${minutes} دقيقة (${hours} ساعة)`;
                        }
                        const minutes = context.parsed.y ?? 0;
                        return `${context.dataset.label}: ${minutes.toFixed(1)} دقيقة`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function (value) {
                        return value + ' د';
                      }
                    }
                  }
                }
              }} />
            
					</div>
				</CardContent>
			</Card>
      }

			{/* Day Details */}
			<Card>
				<CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
						تفاصيل الأيام
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{trendData.days.map((day, index) => (  // Make sure index is included in the map callback
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                day.minutes === trendData.peakDay?.minutes ?
                'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' :
                day.minutes === trendData.lowDay?.minutes ?
                'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' :
                'border-gray-200 dark:border-gray-800'}`
                }>
              
								<div className="flex items-center justify-between mb-2">
									<p className="font-semibold">{day.label}</p>
									{day.minutes === trendData.peakDay?.minutes &&
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                }
									{day.minutes === trendData.lowDay?.minutes &&
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                }
								</div>
								<p className="text-2xl font-bold">{day.hours.toFixed(1)} ساعة</p>
								<p className="text-sm text-muted-foreground">{day.minutes} دقيقة</p>
							</div>
            )}
					</div>
				</CardContent>
			</Card>
		</div>);

}