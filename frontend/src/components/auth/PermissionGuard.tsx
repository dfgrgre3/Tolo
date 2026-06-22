"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasPermission, type Permission, resolvePermissionInput, type UserRole } from "@/lib/auth";

interface PermissionGuardProps {
  permission?: Permission | string;
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
    const resolved = resolvePermissionInput(permission);
    hasAccess = resolved
      ? hasPermission(user as Parameters<typeof hasPermission>[0], resolved)
      : false;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function usePermission() {
  const { user } = useAuth();

  return {
    hasPermission: (permission: Permission | string) =>
      user ? hasPermission(user as Parameters<typeof hasPermission>[0], permission) : false,
    role: user?.role,
    user,
  };
}
