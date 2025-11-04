
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SubjectType } from '@/types/tasks';

interface TaskFormProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export function TaskForm({ control, register, errors }: TaskFormProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className="text-right">
          العنوان
        </Label>
        <Input id="title" {...register('title')} className="col-span-3" />
      </div>
      {errors.title && <p className="text-red-500 col-start-2 col-span-3">{errors.title.message}</p>}

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          الوصف
        </Label>
        <Textarea id="description" {...register('description')} className="col-span-3" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="subject" className="text-right">
          المادة
        </Label>
        <Controller
          name="subject"
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
        <Input id="dueAt" type="datetime-local" {...register('dueAt')} className="col-span-3" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="priority" className="text-right">
          الأولوية
        </Label>
        <Controller
          name="priority"
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
