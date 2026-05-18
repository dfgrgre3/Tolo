import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { SubjectAverage } from './types';

interface SubjectAveragesPanelProps {
  averages: SubjectAverage[];
}

export function SubjectAveragesPanel({ averages }: SubjectAveragesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          متوسط الدرجات حسب المادة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {averages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">لا توجد بيانات كافية لعرض التحليلات</p>
        ) : (
          <div className="space-y-4">
            {averages.map((average) => {
              const gradeValue = Number(average._avg.grade);
              const widthPercent = Math.min(100, gradeValue);
              const roundedValue = Math.round(gradeValue);
              const gradeColor =
                gradeValue >= 90
                  ? 'bg-green-600'
                  : gradeValue >= 80
                    ? 'bg-blue-600'
                    : gradeValue >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-600';
              const ariaLabel = `متوسط ${average.subject}: ${gradeValue.toFixed(1)}%`;

              return (
                <div key={average.subject} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{average.subject}</span>
                    <span className="font-bold">{gradeValue.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" title={ariaLabel}>
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${gradeColor}`}
                      style={{ width: `${widthPercent}%` }}
                      title={`${gradeValue.toFixed(1)}%`}
                      role="progressbar"
                      aria-valuenow={roundedValue}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={ariaLabel}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
