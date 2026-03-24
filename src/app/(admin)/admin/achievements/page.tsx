"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Plus, Trophy, RefreshCw, Award, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { AchievementTable } from "./AchievementTable";
import { AchievementFormDialog } from "./AchievementFormDialog";
import { Achievement } from "./types";
import { motion } from "framer-motion";

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = React.useState<Achievement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAchievement, setEditingAchievement] = React.useState<Achievement | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const fetchAchievements = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/achievements");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      toast.error("حدث خطأ أثناء جلب الإنجازات. يرجى المحاولة مرة أخرى.");
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleOpenDialog = (achievement?: Achievement) => {
    setEditingAchievement(achievement || null);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/achievements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الإنجاز بنجاح");
        fetchAchievements();
      } else {
        toast.error("حدث خطأ أثناء حذف الإنجاز");
      }
    } catch (error) {
      console.error("Error deleting achievement:", error);
      toast.error("حدث خطأ أثناء حذف الإنجاز");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="قاعة أوسمة البسالة 🏅"
        description="سجل البطولات الملحمية، تخليد ذكرى الأبطال، ومنح أوسمة الجدارة للمحاربين المميزين."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={RefreshCw} onClick={fetchAchievements} loading={loading}>
            تحديث السجلات
          </AdminButton>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            صياغة وسام جديد
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <AdminStatsCard
          title="فيالق الأوسمة"
          value={achievements.length}
          description="وسام جدارة متاح"
          icon={Trophy}
          color="yellow"
        />
        <AdminStatsCard
          title="أوسمة الشرف المعلنة"
          value={achievements.filter(a => !a.isSecret).length}
          description="وسام ظاهر للجيش"
          icon={Award}
          color="green"
        />
        <AdminStatsCard
          title="كنوز أسطورية"
          value={achievements.filter(a => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary").length}
          description="أوسمة نادرة جداً"
          icon={Star}
          color="purple"
        />
        <AdminStatsCard
          title="هالات الـ XP"
          value={achievements.reduce((sum, a) => sum + (a.xpReward || 0), 0).toLocaleString()}
          description="إجمالي نقاط الخبرة المتاحة"
          icon={Zap}
          color="blue"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden"
      >
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <AchievementTable
            achievements={achievements}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteRequest}
          />
        )}
      </motion.div>

      <AchievementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingAchievement={editingAchievement}
        onSuccess={() => {
          fetchAchievements();
          setDialogOpen(false);
          setEditingAchievement(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="سحب وسام الشرف؟"
        description="هل أنت متأكد من حذف هذا الوسام من سجلات المملكة؟ هذا القرار سيؤثر على تاريخ المحاربين الحاصلين عليه."
        confirmText="نعم، احذف الوسام"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
