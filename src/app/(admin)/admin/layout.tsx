"use client";

import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { useAuth } from "@/contexts/auth-context";
import { isStaffAdminPanelRole } from "@/lib/auth/admin-panel-roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/admin-login");
    } else if (!isLoading && isAuthenticated && !isStaffAdminPanelRole(user?.role)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isStaffAdminPanelRole(user?.role)) {
    return null;
  }

  return <>{children}</>;
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
