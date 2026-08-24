import { User, X, Save, Edit3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProfileHeader({
  isEditing,
  isSaving,
  hasChanges,
  onEdit,
  onCancel,
  onSave
}: {
  isEditing: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <User className="h-5 w-5 text-primary" />
          </div>
          الملف الشخصي
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mr-14">إدارة معلوماتك الشخصية وتحديث بياناتك</p>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4" />
              إلغاء
            </Button>
            <Button variant="success" onClick={onSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </>
        ) : (
          <Button variant="default" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
            تعديل الملف
          </Button>
        )}
      </div>
    </div>
  );
}
