"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Plus, Trophy, RefreshCw, Award, Star, Zap, Medal } from "lucide-react";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { AchievementTable } from "./AchievementTable";
import { AchievementFormDialog } from "./AchievementFormDialog";
import { Achievement } from "./types";
import { m } from "framer-motion";

import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { logger } from '@/lib/logger';

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
      const response = await adminFetch(apiRoutes.admin.achievements);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAchievements(data.data?.achievements || data.data?.items || data.achievements || []);
    } catch (error) {
      logger.error("Error fetching achievements:", error);
      toast.error("حدث خطأ أثناء جلب سجلات الأوسمة.");
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
      const response = await adminFetch(apiRoutes.admin.achievements, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف الوسام بنجاح");
        fetchAchievements();
      } else {
        toast.error("حدث خطأ أثناء حذف الوسام");
      }
    } catch (error) {
      logger.error("Error deleting achievement:", error);
      toast.error("حدث خطأ أثناء حذف الوسام");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="نظام الأوسمة والتقدير"
        description="إدارة الأوسمة التعليمية، تكريم الطلاب المتميزين، ومنح إنجازات التفوق للمستخدمين والطلاب."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={RefreshCw} onClick={fetchAchievements} loading={loading}>
            تحديث السجلات
          </AdminButton>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            إضافة وسام جديد
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <AdminStatsCard
          title="إجمالي الأوسمة"
          value={achievements.length}
          description="وسام تعليمي متاح"
          icon={Medal}
          color="blue"
        />
        <AdminStatsCard
          title="الأوسمة المعلنة"
          value={achievements.filter(a => !a.isSecret).length}
          description="وسام ظاهر للطلاب"
          icon={Award}
          color="green"
        />
        <AdminStatsCard
          title="فئات التميز"
          value={achievements.filter(a => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary").length}
          description="أوسمة بمستويات متقدمة"
          icon={Star}
          color="purple"
        />
        <AdminStatsCard
          title="مكافآت النقاط"
          value={achievements.reduce((sum, a) => sum + (a.xpReward || 0), 0).toLocaleString()}
          description="إجمالي النقاط المتاحة"
          icon={Zap}
          color="yellow"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden"
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
      </m.div>

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

      <AdminConfirm
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الوسام التعليمي"
        description="هل أنت متأكد من حذف هذا الوسام من سجلات النظام؟ هذا الإجراء سيؤثر على سجلات الطلاب الحاصلين عليه."
        confirmText="تأكيد الحذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
