import { Badge } from '@/components/ui/badge';
import { TaskStatus } from '@/types/tasks';
import { CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';

export const getPriorityBadge = (priority: number) => {
  switch (priority) {
    case 2:
      return <Badge className="bg-red-500 hover:bg-red-600">عالية</Badge>;
    case 1:
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">متوسطة</Badge>;
    default:
      return <Badge className="bg-green-500 hover:bg-green-600">منخفضة</Badge>;
  }
};

export const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'IN_PROGRESS':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'PENDING':
      return <Circle className="h-5 w-5 text-gray-400" />;
    default:
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  }
};

export const isOverdue = (dueAt: string | undefined) => {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
};
