import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Circle } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  autoSave: boolean;
  onAutoSaveToggle: () => void;
  compactView: boolean;
  onCompactViewToggle: () => void;
  showTimeLabels: boolean;
  onShowTimeLabelsToggle: () => void;
  defaultDuration: number;
  onDefaultDurationChange: (duration: number) => void;
}

export function SettingsDialog({
  isOpen,
  onOpenChange,
  autoSave,
  onAutoSaveToggle,
  compactView,
  onCompactViewToggle,
  showTimeLabels,
  onShowTimeLabelsToggle,
  defaultDuration,
  onDefaultDurationChange
}: SettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعدادات الجدول</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>الحفظ التلقائي</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoSaveToggle}
            >
              {autoSave ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>العرض المضغوط</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onCompactViewToggle}
            >
              {compactView ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>إظهار تسميات الوقت</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onShowTimeLabelsToggle}
            >
              {showTimeLabels ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">المدة الافتراضية (دقيقة)</label>
            <Input
              type="number"
              value={defaultDuration}
              onChange={(e) => onDefaultDurationChange(parseInt(e.target.value) || 60)}
              min="15"
              max="480"
            />
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              حفظ وإغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

