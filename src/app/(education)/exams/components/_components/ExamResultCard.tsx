import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Calendar, BookOpen, User, Award, Trash2 } from 'lucide-react';
import { ExamResult } from './types';
import { formatDate, getGradeColor } from './utils';

interface ExamResultCardProps {
  examResult: ExamResult;
  onDelete: (id: string) => void;
}

export function ExamResultCard({ examResult, onDelete }: ExamResultCardProps) {
  const { exam } = examResult;
  const gradeColorClass = getGradeColor(examResult.score, 100);

  return (
    <Card key={examResult.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          <Badge className={gradeColorClass}>{examResult.score}%</Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {exam.subject} - السنة {exam.year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            {formatDate(examResult.takenAt)}
          </div>
          {examResult.teacher && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              {examResult.teacher.name}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Award className="h-4 w-4" />
            {exam.type === 'MIDTERM'
              ? 'امتحان نصفي'
              : exam.type === 'FINAL'
                ? 'امتحان نهائي'
                : exam.type === 'QUIZ'
                  ? 'اختبار قصير'
                  : 'امتحان'}
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(examResult.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`حذف نتيجة ${exam.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
