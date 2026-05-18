"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";
import { ExamResult, Exam } from './types';

interface AddExamResultDialogProps {
  userId: string;
  availableExams: Exam[];
  teachers: { id: string; name: string; subject: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExamResultDialog({
  userId,
  availableExams,
  teachers,
  open,
  onOpenChange,
  onSuccess,
}: AddExamResultDialogProps) {
  const [newExamResult, setNewExamResult] = useState({
    examId: '',
    score: '',
    teacherId: '',
    notes: '',
    isOnline: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddExamResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const scoreNum = parseFloat(newExamResult.score);

    if (!newExamResult.examId) {
      setSubmitError("الرجاء اختيار الامتحان");
      setIsSubmitting(false);
      return;
    }

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setSubmitError("الرجاء إدخال درجة صحيحة بين 0 و 100");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: responseError } = await safeFetch<{ success: boolean; examResult: ExamResult }>(
        '/api/exams/grades',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            examId: newExamResult.examId,
            score: scoreNum,
            teacherId: newExamResult.teacherId || undefined,
            isOnline: newExamResult.isOnline,
            notes: newExamResult.notes,
          }),
        },
        { success: false, examResult: null as unknown as ExamResult },
      );

      if (responseError || !data?.success) {
        const errorMessage = responseError?.message || "فشل إضافة نتيجة الامتحان";
        setSubmitError(errorMessage);
        logger.error('Failed to add exam result:', responseError);
      } else {
        setNewExamResult({
          examId: '',
          score: '',
          teacherId: '',
          notes: '',
          isOnline: false,
        });
        setSubmitError(null);
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      logger.error('Error adding exam result:', error);
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة نتيجة امتحان جديدة</DialogTitle>
          <DialogDescription>اختر الامتحان وأدخل النتيجة</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddExamResult} className="space-y-4">
          <div>
            <Label htmlFor="examId">
              الامتحان <span className="text-red-500">*</span>
            </Label>
            <Select
              value={newExamResult.examId}
              onValueChange={(value) => setNewExamResult({ ...newExamResult, examId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الامتحان" />
              </SelectTrigger>
              <SelectContent>
                {availableExams.length === 0 ? (
                  <SelectItem value="no-exams" disabled>
                    لا توجد امتحانات متاحة
                  </SelectItem>
                ) : (
                  availableExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} - {exam.subject} ({exam.year})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="score">الدرجة</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={newExamResult.score}
              onChange={(e) => setNewExamResult({ ...newExamResult, score: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="teacher">المدرس (اختياري)</Label>
            <Select
              value={newExamResult.teacherId}
              onValueChange={(value) => setNewExamResult({ ...newExamResult, teacherId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المدرس" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.subject})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              value={newExamResult.notes}
              onChange={(e) => setNewExamResult({ ...newExamResult, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="examResultIsOnline"
              checked={newExamResult.isOnline}
              onChange={(e) => setNewExamResult({ ...newExamResult, isOnline: e.target.checked })}
              className="rounded"
              aria-label="نتيجة امتحان أونلاين"
            />
            <Label htmlFor="examResultIsOnline">أونلاين</Label>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSubmitError(null);
              }}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting || availableExams.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
