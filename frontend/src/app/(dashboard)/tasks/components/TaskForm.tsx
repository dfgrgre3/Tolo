import { Control, Controller, FieldErrors, UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SubjectType } from '@/types/tasks';

// Custom glassy styles for form elements
const STYLES = {
  input: "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all rounded-xl shadow-inner font-medium",
  label: "text-right text-gray-300 font-bold text-sm",
  selectContent: "bg-background border-white/10 text-gray-100 backdrop-blur-xl",
  errorText: "text-red-400 text-xs font-bold mt-1",
};

interface TaskFormProps<T extends FieldValues = any> {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}

export function TaskForm<T extends FieldValues>({ control, register, errors }: TaskFormProps<T>) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className={STYLES.label}>
          العنوان
        </Label>
        <div className="col-span-3">
          <Input id="title" {...register('title' as Path<T>)} className={STYLES.input} placeholder="أدخل اسم المهمة القتالية..." />
          {errors.title && <p className={STYLES.errorText}>{String(errors.title.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="description" className={`${STYLES.label} mt-3`}>
          الوصف
        </Label>
        <div className="col-span-3">
          <Textarea id="description" {...register('description' as Path<T>)} className={`${STYLES.input} min-h-[100px] resize-none`} placeholder="صف تفاصيل المهمة وتكتيكاتها الواجب تنفيذها..." />
          {errors.description && <p className={STYLES.errorText}>{String(errors.description.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="subject" className={STYLES.label}>
          المادة (اختياري)
        </Label>
        <div className="col-span-3">
          <Controller
            name={'subject' as Path<T>}
            control={control}
            render={({ field }) => (
              <Select 
                value={field.value || ''} 
                onValueChange={field.onChange}
              >
                <SelectTrigger className={STYLES.input}>
                  <SelectValue placeholder="اختر مجال المعركة" />
                </SelectTrigger>
                <SelectContent className={STYLES.selectContent}>
                  {Object.values(SubjectType).map((subject) => (
                    <SelectItem key={subject} value={subject} className="focus:bg-white/10 focus:text-primary cursor-pointer rounded-lg my-0.5 font-bold transition-colors">
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="dueAt" className={STYLES.label}>
          تاريخ الاستحقاق
        </Label>
        <div className="col-span-3">
          <Input id="dueAt" type="datetime-local" {...register('dueAt' as Path<T>)} className={STYLES.input} />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="priority" className={STYLES.label}>
          الأولوية
        </Label>
        <div className="col-span-3">
          <Controller
            name={'priority' as Path<T>}
            control={control}
            render={({ field }) => (
              <Select 
                value={field.value !== undefined ? String(field.value) : ''} 
                onValueChange={(value) => field.onChange(parseInt(value))}
              >
                <SelectTrigger className={STYLES.input}>
                  <SelectValue placeholder="حدد التهديد ومدى الخطورة" />
                </SelectTrigger>
                <SelectContent className={STYLES.selectContent}>
                  <SelectItem value="0" className="focus:bg-emerald-500/20 focus:text-emerald-400 cursor-pointer rounded-lg my-0.5 font-black text-emerald-500/80 transition-colors">مهمة جانبية (منخفضة)</SelectItem>
                  <SelectItem value="1" className="focus:bg-amber-500/20 focus:text-amber-400 cursor-pointer rounded-lg my-0.5 font-black text-amber-500/80 transition-colors">مهمة قتالية (متوسطة)</SelectItem>
                  <SelectItem value="2" className="focus:bg-red-500/20 focus:text-red-400 cursor-pointer rounded-lg my-0.5 font-black text-red-500/80 transition-colors">مهمة ملحمية (عالية)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </div>
  );
}
