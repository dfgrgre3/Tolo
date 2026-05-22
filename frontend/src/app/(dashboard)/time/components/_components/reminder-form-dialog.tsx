'use client';

import type React from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Reminder, ReminderFormData } from './types';
import { REMINDER_TYPES } from './types';

interface ReminderFormDialogProps {
  readonly reminderToEdit: Reminder | null;
  readonly formData: ReminderFormData;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onCancel: () => void;
  readonly setFormData: React.Dispatch<React.SetStateAction<ReminderFormData>>;
}

export function ReminderFormDialog({
  reminderToEdit,
  formData,
  onSubmit,
  onCancel,
  setFormData
}: ReminderFormDialogProps) {
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {reminderToEdit ? 'تعديل التذكير' : 'تذكير جديد'}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reminder-title" className="block text-sm font-medium mb-1">العنوان *</label>
            <Input
              id="reminder-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="عنوان التذكير"
              required
            />
          </div>

          <div>
            <label htmlFor="reminder-type" className="block text-sm font-medium mb-1">النوع</label>
            <Select
              value={formData.type}
              onValueChange={(value: NonNullable<Reminder['type']>) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="reminder-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="reminder-message" className="block text-sm font-medium mb-1">الرسالة</label>
          <Textarea
            id="reminder-message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="رسالة التذكير"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reminder-time" className="block text-sm font-medium mb-1">وقت التذكير *</label>
            <Input
              id="reminder-time"
              type="datetime-local"
              value={formData.remindAt}
              onChange={(e) => setFormData(prev => ({ ...prev, remindAt: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="reminder-priority" className="block text-sm font-medium mb-1">الأولوية</label>
            <Select
              value={formData.priority}
              onValueChange={(value: NonNullable<Reminder['priority']>) => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger id="reminder-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">منخفضة</SelectItem>
                <SelectItem value="MEDIUM">متوسطة</SelectItem>
                <SelectItem value="HIGH">مهمة</SelectItem>
                <SelectItem value="URGENT">عاجلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reminder-location" className="block text-sm font-medium mb-1">الموقع</label>
            <Input
              id="reminder-location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="موقع التذكير"
            />
          </div>

          <div>
            <label htmlFor="reminder-color" className="block text-sm font-medium mb-1">اللون</label>
            <Input
              id="reminder-color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reminder-tags" className="block text-sm font-medium mb-1">العلامات</label>
          <Input
            id="reminder-tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="علامة1, علامة2, علامة3"
          />
        </div>

        <div>
          <label htmlFor="reminder-notes" className="block text-sm font-medium mb-1">ملاحظات</label>
          <Textarea
            id="reminder-notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="ملاحظات إضافية"
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              />
              <span className="text-sm">تذكير متكرر</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, soundEnabled: e.target.checked }))}
              />
              <span className="text-sm">صوت</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.notificationEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, notificationEnabled: e.target.checked }))}
              />
              <span className="text-sm">إشعار</span>
            </label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label htmlFor="recurring-pattern" className="block text-sm font-medium mb-1">النمط</label>
                <Select
                  value={formData.recurringPattern}
                  onValueChange={(value: NonNullable<Reminder['recurringPattern']>) => setFormData(prev => ({ ...prev, recurringPattern: value }))}
                >
                  <SelectTrigger id="recurring-pattern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">يومي</SelectItem>
                    <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                    <SelectItem value="MONTHLY">شهري</SelectItem>
                    <SelectItem value="YEARLY">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="recurring-interval" className="block text-sm font-medium mb-1">الفترة</label>
                <Input
                  id="recurring-interval"
                  type="number"
                  min="1"
                  value={formData.recurringInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: Number.parseInt(e.target.value, 10) || 1 }))}
                />
              </div>

              <div>
                <label htmlFor="recurring-end-date" className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
                <Input
                  id="recurring-end-date"
                  type="date"
                  value={formData.recurringEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit">
            {reminderToEdit ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
