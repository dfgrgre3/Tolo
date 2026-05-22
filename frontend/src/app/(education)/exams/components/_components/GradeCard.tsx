import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from 'lucide-react';
import { UserGrade } from './types';
import { formatDate, getGradeColor, getAssignmentTypeLabel } from './utils';

interface GradeCardProps {
  grade: UserGrade;
}

export function GradeCard({ grade }: GradeCardProps) {
  const gradeColorClass = getGradeColor(grade.grade, grade.maxGrade);

  return (
    <Card key={grade.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{grade.subject}</CardTitle>
          <Badge className={gradeColorClass}>
            {grade.grade}/{grade.maxGrade}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          {getAssignmentTypeLabel(grade.assignmentType)}
          {grade.isOnline && <Badge variant="outline">أونلاين</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            {formatDate(grade.date)}
          </div>
          {grade.teacher && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              {grade.teacher.name}
            </div>
          )}
          {grade.notes && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{grade.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
