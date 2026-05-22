import { User, X, Save, Edit3, Loader2 } from 'lucide-react';
import { m } from "framer-motion";

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
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <User className="h-5 w-5 text-indigo-400" />
          </div>
          الملف الشخصي
        </h1>
        <p className="text-sm text-slate-400 mt-1 mr-14">إدارة معلوماتك الشخصية وتحديث بياناتك</p>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <m.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 hover:text-white transition-all border border-white/10"
            >
              <X className="h-4 w-4" />
              إلغاء
            </m.button>
            <m.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </m.button>
          </>
        ) : (
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium hover:bg-indigo-500/30 transition-all"
          >
            <Edit3 className="h-4 w-4" />
            تعديل الملف
          </m.button>
        )}
      </div>
    </div>
  );
}
