import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOCK_TYPES, DAYS_OF_WEEK } from './constants';
import type { TimeBlock } from './types';

interface BlockFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  blockToEdit: TimeBlock | null;
  formData: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    day: number;
    color: string;
    type: TimeBlock['type'];
    subject: string;
    priority: TimeBlock['priority'];
    isRecurring: boolean;
    recurringPattern: TimeBlock['recurringPattern'];
    reminders: number[];
    location: string;
    notes: string;
  };
  subjects: string[];
  onFormDataChange: (updates: Partial<BlockFormDialogProps['formData']>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
}

export function BlockFormDialog({
  isOpen,
  onOpenChange,
  blockToEdit,
  formData,
  subjects,
  onFormDataChange,
  onSubmit,
  onDelete
}: BlockFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {blockToEdit ? 'تعديل الحدث' : 'حدث جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">العنوان *</label>
              <Input
                value={formData.title}
                onChange={(e) => onFormDataChange({ title: e.target.value })}
                placeholder="عنوان الحدث"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">النوع</label>
              <Select 
                value={formData.type} 
                onValueChange={(value: any) => onFormDataChange({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map(type => (
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
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <Textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ description: e.target.value })}
              placeholder="وصف تفصيلي للحدث"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اليوم</label>
              <Select 
                value={formData.day.toString()} 
                onValueChange={(value) => onFormDataChange({ day: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">وقت البداية</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => onFormDataChange({ startTime: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">وقت النهاية</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => onFormDataChange({ endTime: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === 'STUDY' && (
              <div>
                <label className="block text-sm font-medium mb-1">المادة</label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => onFormDataChange({ subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">الأولوية</label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: any) => onFormDataChange({ priority: value })}
              >
                <SelectTrigger>
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
              <label className="block text-sm font-medium mb-1">الموقع</label>
              <Input
                value={formData.location}
                onChange={(e) => onFormDataChange({ location: e.target.value })}
                placeholder="موقع الحدث"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">اللون</label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => onFormDataChange({ color: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => onFormDataChange({ notes: e.target.value })}
              placeholder="ملاحظات إضافية"
              rows={2}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => onFormDataChange({ isRecurring: e.target.checked })}
              />
              <span className="text-sm">حدث متكرر</span>
            </label>
            
            {formData.isRecurring && (
              <Select 
                value={formData.recurringPattern} 
                onValueChange={(value: any) => onFormDataChange({ recurringPattern: value })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">يومي</SelectItem>
                  <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                  <SelectItem value="MONTHLY">شهري</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            {blockToEdit && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={onDelete}
              >
                حذف
              </Button>
            )}
            <Button type="submit">
              {blockToEdit ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

