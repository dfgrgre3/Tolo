import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Split, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <AdminCard variant="glass" className="p-10 text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <Split className="w-12 h-12 text-muted-foreground" />
        <h4 className="font-bold text-lg">لا توجد تجارب مطابقة لبحثك</h4>
        <p className="text-muted-foreground max-w-md">
          حاول تعديل معايير البحث أو إنشاء تجربة جديدة لبدء تحسين تجربة الطلاب.
        </p>
        <AdminButton 
          icon={Plus} 
          className="mt-4 gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
          onClick={() => onCreateClick()}
        >
          إنشاء تجربة أولى
        </AdminButton>
      </div>
    </AdminCard>
  );
};
