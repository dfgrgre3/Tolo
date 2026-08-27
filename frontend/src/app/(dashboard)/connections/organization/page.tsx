"use client";

import { Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Placeholder entry point for linking the user's account to an
 * organization/institution. There is no backend support for this flow yet
 * (no organization-membership API), so this page only establishes the
 * discoverable navigation entry point ("ربط الحساب") — it does not perform
 * a real linking action.
 */
export default function ConnectOrganizationPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center px-4 py-24" dir="rtl">
      <div className="max-w-lg w-full text-center bg-[#111114] border border-white/5 rounded-[2.5rem] p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-500">
          <Building2 size={28} />
        </div>
        <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-0">قريباً</Badge>
        <h1 className="text-2xl font-bold mb-3">ربط الحساب بمنظمة</h1>
        <p className="text-gray-400 leading-7 mb-2">
          هذه الميزة قيد التطوير. لاحقاً ستتمكن هنا من ربط حسابك بمنظمة أو
          مؤسسة تعليمية للوصول إلى محتوى وصلاحيات خاصة بها.
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Users size={14} />
          <span>تواصل مع الدعم الفني لمزيد من التفاصيل حول هذه الميزة</span>
        </div>
      </div>
    </div>
  );
}
