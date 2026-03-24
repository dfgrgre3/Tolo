import { Control, Controller, FieldErrors, UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SubjectType } from '@/types/tasks';

interface TaskFormProps<T extends FieldValues = any> {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}

export function TaskForm<T extends FieldValues>({ control, register, errors }: TaskFormProps<T>) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className="text-right">
          العنوان
        </Label>
        <Input id="title" {...register('title' as Path<T>)} className="col-span-3" />
      </div>
      {errors.title && <p className="text-red-500 col-start-2 col-span-3">{String(errors.title.message)}</p>}

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          الوصف
        </Label>
        <Textarea id="description" {...register('description' as Path<T>)} className="col-span-3" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="subject" className="text-right">
          المادة
        </Label>
        <Controller
          name={'subject' as Path<T>}
          control={control}
          render={({ field }) => (
            <Select 
              value={field.value || ''} 
              onValueChange={field.onChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SubjectType).map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="dueAt" className="text-right">
          تاريخ الاستحقاق
        </Label>
        <Input id="dueAt" type="datetime-local" {...register('dueAt' as Path<T>)} className="col-span-3" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="priority" className="text-right">
          الأولوية
        </Label>
        <Controller
          name={'priority' as Path<T>}
          control={control}
          render={({ field }) => (
            <Select 
              value={field.value !== undefined ? String(field.value) : ''} 
              onValueChange={(value) => field.onChange(parseInt(value))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="اختر الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">منخفضة</SelectItem>
                <SelectItem value="1">متوسطة</SelectItem>
                <SelectItem value="2">عالية</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </>
  );
}
