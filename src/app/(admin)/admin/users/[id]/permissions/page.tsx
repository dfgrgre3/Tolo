"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminBadge } from "@/components/admin/ui/admin-badge";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";
import { logger } from '@/lib/logger';

const permissionGroups = [
  {
    title: "المستخدمون",
    permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE, PERMISSIONS.STUDENTS_VIEW],
  },
  {
    title: "المحتوى والتعلم",
    permissions: [
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.SUBJECTS_MANAGE,
      PERMISSIONS.OWN_SUBJECTS_MANAGE,
      PERMISSIONS.BOOKS_VIEW,
      PERMISSIONS.BOOKS_MANAGE,
      PERMISSIONS.OWN_BOOKS_MANAGE,
      PERMISSIONS.RESOURCES_VIEW,
      PERMISSIONS.RESOURCES_MANAGE,
      PERMISSIONS.OWN_RESOURCES_MANAGE,
      PERMISSIONS.EXAMS_VIEW,
      PERMISSIONS.EXAMS_MANAGE,
      PERMISSIONS.OWN_EXAMS_MANAGE,
    ],
  },
  {
    title: "المجتمع والعمليات",
    permissions: [
      PERMISSIONS.FORUM_VIEW,
      PERMISSIONS.FORUM_MODERATE,
      PERMISSIONS.FORUM_MANAGE,
      PERMISSIONS.BLOG_VIEW,
      PERMISSIONS.BLOG_MANAGE,
      PERMISSIONS.COMMENTS_VIEW,
      PERMISSIONS.COMMENTS_MODERATE,
      PERMISSIONS.EVENTS_VIEW,
      PERMISSIONS.EVENTS_MANAGE,
      PERMISSIONS.ANNOUNCEMENTS_VIEW,
      PERMISSIONS.ANNOUNCEMENTS_MANAGE,
      PERMISSIONS.AUDIT_LOGS_VIEW,
      PERMISSIONS.LIVE_MONITOR_VIEW,
    ],
  },
  {
    title: "التحليلات والإدارة",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.AI_MANAGE,
      PERMISSIONS.MARKETING_VIEW,
      PERMISSIONS.AB_TESTING_VIEW,
    ],
  },
  {
    title: "التحفيز",
    permissions: [
      PERMISSIONS.CHALLENGES_VIEW,
      PERMISSIONS.CHALLENGES_MANAGE,
      PERMISSIONS.OWN_CHALLENGES_MANAGE,
      PERMISSIONS.CONTESTS_VIEW,
      PERMISSIONS.CONTESTS_MANAGE,
      PERMISSIONS.ACHIEVEMENTS_VIEW,
      PERMISSIONS.ACHIEVEMENTS_MANAGE,
      PERMISSIONS.REWARDS_VIEW,
      PERMISSIONS.REWARDS_MANAGE,
      PERMISSIONS.SEASONS_VIEW,
      PERMISSIONS.SEASONS_MANAGE,
      PERMISSIONS.TEACHERS_VIEW,
      PERMISSIONS.TEACHERS_MANAGE,
    ],
  },
] as const;

const permissionLabels: Record<string, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: "عرض لوحة التحكم",
  [PERMISSIONS.ANALYTICS_VIEW]: "عرض التحليلات",
  [PERMISSIONS.REPORTS_VIEW]: "عرض التقارير",
  [PERMISSIONS.USERS_VIEW]: "عرض المستخدمين",
  [PERMISSIONS.USERS_MANAGE]: "إدارة المستخدمين",
  [PERMISSIONS.STUDENTS_VIEW]: "عرض الطلاب",
  [PERMISSIONS.SUBJECTS_VIEW]: "عرض المواد",
  [PERMISSIONS.SUBJECTS_MANAGE]: "إدارة المواد",
  [PERMISSIONS.OWN_SUBJECTS_MANAGE]: "إدارة المواد الخاصة",
  [PERMISSIONS.BOOKS_VIEW]: "عرض الكتب",
  [PERMISSIONS.BOOKS_MANAGE]: "إدارة الكتب",
  [PERMISSIONS.OWN_BOOKS_MANAGE]: "إدارة الكتب الخاصة",
  [PERMISSIONS.RESOURCES_VIEW]: "عرض الموارد",
  [PERMISSIONS.RESOURCES_MANAGE]: "إدارة الموارد",
  [PERMISSIONS.OWN_RESOURCES_MANAGE]: "إدارة الموارد الخاصة",
  [PERMISSIONS.EXAMS_VIEW]: "عرض الاختبارات",
  [PERMISSIONS.EXAMS_MANAGE]: "إدارة الاختبارات",
  [PERMISSIONS.OWN_EXAMS_MANAGE]: "إدارة الاختبارات الخاصة",
  [PERMISSIONS.TEACHERS_VIEW]: "عرض المعلمين",
  [PERMISSIONS.TEACHERS_MANAGE]: "إدارة المعلمين",
  [PERMISSIONS.SEASONS_VIEW]: "عرض المواسم",
  [PERMISSIONS.SEASONS_MANAGE]: "إدارة المواسم",
  [PERMISSIONS.CHALLENGES_VIEW]: "عرض التحديات",
  [PERMISSIONS.CHALLENGES_MANAGE]: "إدارة التحديات",
  [PERMISSIONS.OWN_CHALLENGES_MANAGE]: "إدارة التحديات الخاصة",
  [PERMISSIONS.CONTESTS_VIEW]: "عرض المسابقات",
  [PERMISSIONS.CONTESTS_MANAGE]: "إدارة المسابقات",
  [PERMISSIONS.BLOG_VIEW]: "عرض المدونة",
  [PERMISSIONS.BLOG_MANAGE]: "إدارة المدونة",
  [PERMISSIONS.FORUM_VIEW]: "عرض المنتدى",
  [PERMISSIONS.FORUM_MODERATE]: "إشراف المنتدى",
  [PERMISSIONS.FORUM_MANAGE]: "إدارة المنتدى",
  [PERMISSIONS.COMMENTS_VIEW]: "عرض التعليقات",
  [PERMISSIONS.COMMENTS_MODERATE]: "إشراف التعليقات",
  [PERMISSIONS.EVENTS_VIEW]: "عرض الفعاليات",
  [PERMISSIONS.EVENTS_MANAGE]: "إدارة الفعاليات",
  [PERMISSIONS.ANNOUNCEMENTS_VIEW]: "عرض الإعلانات",
  [PERMISSIONS.ANNOUNCEMENTS_MANAGE]: "إدارة الإعلانات",
  [PERMISSIONS.ACHIEVEMENTS_VIEW]: "عرض الإنجازات",
  [PERMISSIONS.ACHIEVEMENTS_MANAGE]: "إدارة الإنجازات",
  [PERMISSIONS.REWARDS_VIEW]: "عرض المكافآت",
  [PERMISSIONS.REWARDS_MANAGE]: "إدارة المكافآت",
  [PERMISSIONS.AI_MANAGE]: "إدارة أدوات الذكاء",
  [PERMISSIONS.LIVE_MONITOR_VIEW]: "مراقبة العمليات الحية",
  [PERMISSIONS.MARKETING_VIEW]: "عرض التسويق",
  [PERMISSIONS.AB_TESTING_VIEW]: "عرض اختبارات A/B",
  [PERMISSIONS.SETTINGS_VIEW]: "عرض الإعدادات",
  [PERMISSIONS.SETTINGS_MANAGE]: "إدارة الإعدادات",
  [PERMISSIONS.AUDIT_LOGS_VIEW]: "عرض سجل التدقيق",
};

interface UserPermissionsResponse {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "MODERATOR" | "USER";
  permissions?: string[];
}

export default function UserPermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserPermissionsResponse | null>(null);
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          toast.error("تعذر تحميل بيانات المستخدم");
          router.push("/admin/users");
          return;
        }

        const data = (await response.json()) as UserPermissionsResponse;
        setUser(data);
        setSelectedPermissions(data.permissions ?? []);
      } catch (error) {
        logger.error("Error fetching user permissions:", error);
        toast.error("حدث خطأ أثناء تحميل الصلاحيات");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router, userId]);

  const togglePermission = (permission: string, checked: boolean) => {
    setSelectedPermissions((current) =>
      checked ? Array.from(new Set([...current, permission])) : current.filter((item) => item !== permission),
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          permissions: selectedPermissions,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error || "تعذر حفظ الصلاحيات");
        return;
      }

      toast.success("تم تحديث الصلاحيات");
      router.push(`/admin/users/${userId}`);
    } catch (error) {
      logger.error("Error saving permissions:", error);
      toast.error("حدث خطأ أثناء حفظ الصلاحيات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const defaultPermissions = new Set(DEFAULT_ROLE_PERMISSIONS[user.role] ?? []);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={`صلاحيات ${user.name || user.email}`}
        description="الصلاحيات الافتراضية تأتي من الدور، وما تختاره هنا يمثل صلاحيات إضافية مخصصة لهذا المستخدم."
      >
        <AdminButton variant="outline" onClick={() => router.push(`/admin/users/${userId}`)}>
          رجوع
        </AdminButton>
        <AdminButton icon={Save} loading={isSaving} onClick={handleSave}>
          حفظ الصلاحيات
        </AdminButton>
      </PageHeader>

      <Card className="border-primary/15 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            ملخص الدور
          </CardTitle>
          <CardDescription>
            الدور الحالي: <span className="font-medium text-foreground">{user.role}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Array.from(defaultPermissions).map((permission) => (
            <AdminBadge key={permission} variant="outline" status="info">
              {permissionLabels[permission] || permission}
            </AdminBadge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {permissionGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
              <CardDescription>تفعيل صلاحيات إضافية حسب احتياج هذا المستخدم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.permissions.map((permission) => {
                const inherited = defaultPermissions.has(permission);
                const checked = inherited || selectedPermissions.includes(permission);

                return (
                  <label
                    key={permission}
                    className="flex items-start justify-between gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{permissionLabels[permission] || permission}</span>
                        {inherited && (
                          <AdminBadge variant="outline" status="neutral">
                            من الدور
                          </AdminBadge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{permission}</p>
                    </div>
                    <Checkbox
                      checked={checked}
                      disabled={inherited}
                      onCheckedChange={(value) => togglePermission(permission, value === true)}
                    />
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LockKeyhole className="h-5 w-5" />
            ملاحظة تنفيذية
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          إذا كان المستخدم يملك الصلاحية أصلًا من خلال الدور فلن تحتاج لإضافتها هنا، ولا يمكن إلغاءها من هذه الصفحة.
        </CardContent>
      </Card>
    </div>
  );
}
