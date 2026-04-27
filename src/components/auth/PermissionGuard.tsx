"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasPermission, Permission } from "@/lib/permissions";
import { UserRole } from "@/types/enums";

interface PermissionGuardProps {
  permission?: Permission;
  role?: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  role,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <>{fallback}</>;

  let hasAccess = true;

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    hasAccess = roles.includes(user.role as UserRole);
  }

  if (hasAccess && permission) {
    hasAccess = hasPermission(user as Parameters<typeof hasPermission>[0], permission);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function usePermission() {
  const { user } = useAuth();
  
  return {
    hasPermission: (permission: Permission) => (user ? hasPermission(user as Parameters<typeof hasPermission>[0], permission) : false),
    role: user?.role,
    user,
  };
}
