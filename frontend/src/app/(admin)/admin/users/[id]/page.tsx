"use client";

import { adminFetch } from "@/lib/api/admin-api";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Activity,
  BookOpen,
  History,
  Settings,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";
import { logger } from '@/lib/logger';

import type { UserDetails } from "./_components/types";
import { UserSkeleton } from "./_components/user-skeleton";
import { UserProfileSidebar } from "./_components/user-profile-sidebar";
import { UserStatsGrid } from "./_components/user-stats-grid";
import { OverviewTab } from "./_components/overview-tab";
import { AcademicTab } from "./_components/academic-tab";
import { ActivityTab } from "./_components/activity-tab";
import { SettingsTab } from "./_components/settings-tab";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [editedUser, setEditedUser] = React.useState<Partial<UserDetails>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const { playSound } = usePremiumSounds();

  const fetchUser = React.useCallback(async () => {
    try {
      const response = await adminFetch(`/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setEditedUser(data);
      } else {
        toast.error("المستخدم غير موجود");
        router.push("/admin/users");
      }
    } catch (error) {
      logger.error("Error fetching user:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المستخدم");
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdate = async () => {
    try {
      const response = await adminFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedUser)
      });

      if (response.ok) {
        toast.success("تم تحديث بيانات المستخدم بنجاح");
        setIsEditing(false);
        fetchUser();
      } else {
        const data = await response.json();
        toast.error(data.message || "حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      logger.error("Error updating user:", error);
      toast.error("حدث خطأ أثناء تحديث بيانات المستخدم");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await adminFetch(`/admin/users/${userId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        toast.success("تم حذف المستخدم بنجاح");
        router.push("/admin/users");
      } else {
        toast.error("حدث خطأ أثناء حذف المستخدم");
      }
    } catch (error) {
      logger.error("Error deleting user:", error);
      toast.error("حدث خطأ في الاتصال بالخادم");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (loading) return <UserSkeleton />;
  if (!user) return null;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={user.name || "تفاصيل المستخدم"}
          description={`إدارة بيانات ونشاط ${user.name || user.email}`}
          className="p-0" />

        <div className="flex items-center gap-3">
          <AdminButton variant="outline" className="rounded-2xl border-white/10" onClick={() => router.push("/admin/users")} icon={ArrowRight}>
            قائمة المستخدمين
          </AdminButton>
          <AdminButton
            variant="destructive"
            className="rounded-2xl shadow-xl shadow-danger/20"
            onClick={() => setDeleteDialogOpen(true)}
            icon={Trash2}
          >
            حذف المستخدم
          </AdminButton>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <UserProfileSidebar user={user} setActiveTab={setActiveTab} router={router} />

        <div className="lg:col-span-3 space-y-8">
          <UserStatsGrid user={user} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="bg-card p-1.5 rounded-2xl border shadow-sm inline-flex w-full md:w-auto">
              <TabsList className="bg-transparent h-10 w-full md:w-auto">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <Activity className="h-4 w-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="academic" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <BookOpen className="h-4 w-4" />
                  الأداء الأكاديمي
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <History className="h-4 w-4" />
                  سجل النشاط
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg flex items-center gap-2 px-6">
                  <Settings className="h-4 w-4" />
                  الإعدادات
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OverviewTab user={user} />
            </TabsContent>

            <TabsContent value="academic">
              <AcademicTab user={user} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTab user={user} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                user={user}
                editedUser={editedUser}
                setEditedUser={setEditedUser}
                handleUpdate={handleUpdate}
                setIsEditing={setIsEditing}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AdminConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="حذف المستخدم نهائياً؟"
        description="هل أنت متأكد من حذف هذا المستخدم؟ سيتم مسح جميع بياناته ونشاطه من المنصة ولا يمكن التراجع عن هذا الإجراء."
        confirmText="تأكيد الحذف"
        variant="destructive"
      />
    </div>);
}
