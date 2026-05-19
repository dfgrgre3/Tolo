"use client";

import { AdminLayout } from "@/components/admin/layout/admin-layout";

/**
 * Sub‑layout for the `subjects` admin section. It re‑uses the same
 * `AdminLayout` (sidebar, header, etc.) so any page inside
 * `app/(admin)/subjects/*` automatically gets the admin UI.
 */
export default function SubjectsLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
