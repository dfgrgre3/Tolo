'use client';

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { UseFormReturn } from "react-hook-form";
import type * as z from "zod";
import type { SubjectType, Task } from './task-types';
import { taskSchema } from './task-types';

interface TaskFormDialogProps {
  readonly taskToEdit: Task | null;
  readonly subjects: SubjectType[];
  readonly form: UseFormReturn<z.infer<typeof taskSchema>>;
  readonly onSubmit: (values: z.infer<typeof taskSchema>) => Promise<void>;
  readonly onCancel: () => void;
}

export function TaskFormDialog({
  taskToEdit,
  subjects,
  form,
  onSubmit,
  onCancel,
}: TaskFormDialogProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {taskToEdit ? 'تعديل المهمة' : 'مهمة جديدة'}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العنوان *</FormLabel>
                <FormControl>
                  <Input placeholder="عنوان المهمة" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الوصف</FormLabel>
                <FormControl>
                  <Textarea placeholder="وصف تفصيلي للمهمة" rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المادة</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المادة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الأولوية</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">منخفضة</SelectItem>
                      <SelectItem value="MEDIUM">متوسطة</SelectItem>
                      <SelectItem value="HIGH">مهمة</SelectItem>
                      <SelectItem value="URGENT">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الاستحقاق</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوقت المتوقع (دقيقة)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="480"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العلامات</FormLabel>
                <FormControl>
                  <Input
                    placeholder="علامة1, علامة2, علامة3"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            <Button type="submit">
              {taskToEdit ? 'تحديث' : 'إنشاء'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
