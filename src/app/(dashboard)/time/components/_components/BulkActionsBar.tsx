'use client';

import { CheckCircle, Play, Trash2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  readonly selectedCount: number;
  readonly onComplete: () => void;
  readonly onStart: () => void;
  readonly onDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onComplete,
  onStart,
  onDelete,
}: BulkActionsBarProps) {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            تم تحديد {selectedCount} مهمة
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={onComplete}>
              <CheckCircle className="h-4 w-4 mr-1" />
              إكمال
            </Button>
            <Button size="sm" variant="outline" onClick={onStart}>
              <Play className="h-4 w-4 mr-1" />
              بدء
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              حذف
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
