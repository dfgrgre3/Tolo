"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { MoreHorizontal, Plus, Edit, Trash2, Trophy, Eye, RefreshCw, Award, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { AchievementTable } from "./AchievementTable";
import { AchievementFormDialog } from "./AchievementFormDialog";
import { Achievement } from "./types";

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

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
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
    <div className="space-y-6">
      <PageHeader
        title="إدارة الإنجازات"
        description="عرض وإدارة جميع الإنجازات في الموقع"
      >
        <div className="flex items-center gap-2">
          <AdminButton variant="outline" size="sm" icon={RefreshCw} onClick={fetchAchievements}>
            تحديث
          </AdminButton>
          <AdminButton icon={Plus}>
            إضافة إنجاز
          </AdminButton>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatsCard
          title="إجمالي الإنجازات"
          value={achievements.length}
          description="إنجاز متاح"
          icon={Trophy}
          color="yellow"
        />
        <AdminStatsCard
          title="إنجازات غير سرية"
          value={achievements.filter(a => !a.isSecret).length}
          description="إنجاز ظاهر"
          icon={Award}
          color="green"
        />
        <AdminStatsCard
          title="إنجازات نادرة"
          value={achievements.filter(a => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary").length}
          description="إنجاز مميز"
          icon={Star}
          color="purple"
        />
        <AdminStatsCard
          title="إجمالي XP"
          value={achievements.reduce((sum, a) => sum + (a.xpReward || 0), 0).toLocaleString()}
          description="نقاط خبرة"
          icon={Zap}
          color="blue"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : (
        <AchievementTable
          achievements={achievements}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

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
        title="حذف الإنجاز"
        description="هل أنت متأكد من حذف هذا الإنجاز؟"
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
