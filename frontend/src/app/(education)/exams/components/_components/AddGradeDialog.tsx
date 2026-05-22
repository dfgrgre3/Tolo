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
import { assignmentTypes } from './utils';

interface AddGradeDialogProps {
  userId: string;
  subjects: string[];
  teachers: { id: string; name: string; subject: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddGradeDialog({ userId, subjects, teachers, open, onOpenChange, onSuccess }: AddGradeDialogProps) {
  const [newGrade, setNewGrade] = useState({
    subject: '',
    grade: '',
    maxGrade: '100',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    isOnline: false,
    assignmentType: 'OTHER',
    teacherId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const gradeNum = parseFloat(newGrade.grade);
    const maxGradeNum = parseFloat(newGrade.maxGrade);

    if (isNaN(gradeNum) || gradeNum < 0) {
      setSubmitError("الرجاء إدخال درجة صحيحة");
      setIsSubmitting(false);
      return;
    }

    if (isNaN(maxGradeNum) || maxGradeNum <= 0) {
      setSubmitError("الرجاء إدخال درجة عظمى صحيحة");
      setIsSubmitting(false);
      return;
    }

    if (gradeNum > maxGradeNum) {
      setSubmitError("الدرجة لا يمكن أن تكون أكبر من الدرجة العظمى");
      setIsSubmitting(false);
      return;
    }

    if (!newGrade.subject) {
      setSubmitError("الرجاء اختيار المادة");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: responseError } = await safeFetch<{ success: boolean }>(
        '/api/grades',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            subject: newGrade.subject,
            grade: gradeNum,
            maxGrade: maxGradeNum,
            date: newGrade.date,
            notes: newGrade.notes,
            isOnline: newGrade.isOnline,
            assignmentType: newGrade.assignmentType,
            teacherId: newGrade.teacherId || undefined,
          }),
        },
        { success: false },
      );

      if (responseError || !data?.success) {
        const errorMessage = responseError?.message || "فشل إضافة الدرجة";
        setSubmitError(errorMessage);
        logger.error('Failed to add grade:', responseError);
      } else {
        setNewGrade({
          subject: '',
          grade: '',
          maxGrade: '100',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          isOnline: false,
          assignmentType: 'OTHER',
          teacherId: '',
        });
        setSubmitError(null);
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      logger.error('Error adding grade:', error);
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة درجة جديدة</DialogTitle>
          <DialogDescription>أدخل معلومات الدرجة الجديدة</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddGrade} className="space-y-4">
          <div>
            <Label htmlFor="subject">المادة</Label>
            <Select
              value={newGrade.subject}
              onValueChange={(value) => setNewGrade({ ...newGrade, subject: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grade">الدرجة</Label>
              <Input
                id="grade"
                type="number"
                min="0"
                value={newGrade.grade}
                onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="maxGrade">الدرجة العظمى</Label>
              <Input
                id="maxGrade"
                type="number"
                min="1"
                value={newGrade.maxGrade}
                onChange={(e) => setNewGrade({ ...newGrade, maxGrade: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={newGrade.date}
              onChange={(e) => setNewGrade({ ...newGrade, date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="assignmentType">نوع الواجب</Label>
            <Select
              value={newGrade.assignmentType}
              onValueChange={(value) => setNewGrade({ ...newGrade, assignmentType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="teacher">المدرس (اختياري)</Label>
            <Select
              value={newGrade.teacherId}
              onValueChange={(value) => setNewGrade({ ...newGrade, teacherId: value })}
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
              value={newGrade.notes}
              onChange={(e) => setNewGrade({ ...newGrade, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gradeIsOnline"
              checked={newGrade.isOnline}
              onChange={(e) => setNewGrade({ ...newGrade, isOnline: e.target.checked })}
              className="rounded"
              aria-label="امتحان أونلاين"
            />
            <Label htmlFor="gradeIsOnline">أونلاين</Label>
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
            <Button type="submit" disabled={isSubmitting}>
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
