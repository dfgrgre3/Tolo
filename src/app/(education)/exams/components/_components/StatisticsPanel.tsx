import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Statistics {
  totalGrades: number;
  averageGrade: number;
  maxGrade: number;
  minGrade: number;
}

interface StatisticsPanelProps {
  statistics: Statistics | null;
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إحصائيات عامة</CardTitle>
      </CardHeader>
      <CardContent>
        {!statistics ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            لا توجد بيانات كافية لعرض الإحصائيات
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">عدد الدرجات المسجلة</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statistics.totalGrades}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">متوسط الدرجات العام</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statistics.averageGrade.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-200">أعلى درجة</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {statistics.maxGrade}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">أقل درجة</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {statistics.minGrade}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
