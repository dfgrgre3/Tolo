"use client";

import * as React from "react";
import { Bell, RefreshCw, RotateCcw, Send, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { useUnifiedNotifications } from "@/hooks/use-unified-notifications";

export default function AdminNotificationsPage() {
  const {
    broadcasts,
    stats,
    isLoading,
    refetch,
    cancelBroadcast,
    resendFailed,
    isCancelling,
    isResending,
  } = useUnifiedNotifications();

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <PageHeader
        title="إدارة الإشعارات"
        description="متابعة البث الجماعي، الإحصاءات، وإعادة محاولة الرسائل الفاشلة."
      >
        <AdminButton variant="outline" icon={RefreshCw} onClick={refetch} loading={isLoading}>
          تحديث
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminCard className="p-5">
          <p className="text-xs font-bold text-muted-foreground">إجمالي البث</p>
          <h3 className="mt-2 text-3xl font-black">{broadcasts.length}</h3>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-bold text-muted-foreground">تم الإرسال</p>
          <h3 className="mt-2 text-3xl font-black">{stats?.sent || stats?.totalSent || 0}</h3>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-bold text-muted-foreground">فشل</p>
          <h3 className="mt-2 text-3xl font-black">{stats?.failed || stats?.totalFailed || 0}</h3>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-bold text-muted-foreground">قيد الجدولة</p>
          <h3 className="mt-2 text-3xl font-black">
            {broadcasts.filter((broadcast) => broadcast.status === "scheduled").length}
          </h3>
        </AdminCard>
      </div>

      <AdminCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-black">سجل البث</h2>
          </div>
          <AdminButton variant="outline" icon={RefreshCw} onClick={refetch} loading={isLoading}>
            تحديث
          </AdminButton>
        </div>

        <div className="divide-y">
          {broadcasts.length === 0 && (
            <div className="p-8 text-center text-sm font-bold text-muted-foreground">
              لا توجد حملات إشعارات حتى الآن.
            </div>
          )}

          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{broadcast.title}</h3>
                  <Badge variant="outline">{broadcast.status}</Badge>
                  <Badge variant="secondary">{broadcast.type}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{broadcast.message}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>الإجمالي: {broadcast.stats?.total ?? 0}</span>
                  <span>تم: {broadcast.stats?.sent ?? 0}</span>
                  <span>فشل: {broadcast.stats?.failed ?? 0}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {broadcast.status === "scheduled" && (
                  <AdminButton
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    loading={isCancelling}
                    onClick={() => cancelBroadcast(broadcast.id)}
                  >
                    إلغاء
                  </AdminButton>
                )}
                {(broadcast.stats?.failed || 0) > 0 && (
                  <AdminButton
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    loading={isResending}
                    onClick={() => resendFailed(broadcast.id)}
                  >
                    إعادة المحاولة
                  </AdminButton>
                )}
                <AdminButton variant="ghost" size="sm" icon={Send}>
                  التفاصيل
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
