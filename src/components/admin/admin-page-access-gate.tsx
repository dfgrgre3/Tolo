"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getRequiredPermissionForAdminPath } from "@/lib/admin-panel-route-access";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export function AdminPageAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { user, isLoading } = useAuth();

  const required = React.useMemo(
    () => getRequiredPermissionForAdminPath(pathname),
    [pathname],
  );

  const allowed = React.useMemo(() => {
    if (!required || !user) return true;
    return hasPermission(user, required);
  }, [required, user]);

  if (isLoading || !user) {
    return null;
  }

  if (!allowed && required) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-muted/30 p-8 text-center"
        dir="rtl"
      >
        <h1 className="text-xl font-bold text-foreground">لا يمكن الوصول لهذه الصفحة</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          حسابك لا يملك الصلاحية المطلوبة لهذا القسم. إذا كنت تعتقد أن هذا خطأ، راجع المسؤول عن المنصة.
        </p>
        <p className="text-xs font-mono text-muted-foreground/80">
          {required === PERMISSIONS.ADMIN_BYPASS
            ? "مطلوب صلاحية إدارية كاملة (*:*)."
            : `الصلاحية المطلوبة: ${required}`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild variant="default">
            <Link href="/admin">العودة للوحة التحكم</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">الصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
