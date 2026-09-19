"use client";

/**
 * Backward-Compatibility Facade (P0-11)
 *
 * All permission checking logic has moved to the canonical
 * Auth domain at `@/features/auth/hooks/use-permission`.
 */
export {
  usePermission,
  type UserRole,
} from "@/features/auth/hooks/use-permission";
