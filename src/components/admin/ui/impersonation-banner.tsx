"use client";

import * as React from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = React.useState(false);

  React.useEffect(() => {
    // Check for cookie
    const checkImpersonating = () => {
      const isImp = document.cookie.split('; ').find(row => row.startsWith('is_impersonating='));
      setIsImpersonating(!!isImp);
    };

    checkImpersonating();
    // Poll or listen for events if needed, but cookie simple check is usually enough on mount/navigation
    const interval = setInterval(checkImpersonating, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStop = async () => {
    try {
      await apiClient.delete<any>("/admin/impersonate");
      toast.success("تم إيقاف المحاكاة، العودة لوضع المدير");
      // Clear cookie manually just in case
      document.cookie = "is_impersonating=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/admin/users";
    } catch (_err) {
      toast.error("حدث خطأ ما");
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-[100] shadow-md animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="h-5 w-5 animate-pulse" />
        <span>أنت الآن في وضع المحاكاة. أنت تتصفح الموقع كـ مستخدم آخر.</span>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={handleStop}
        className="bg-white text-amber-600 hover:bg-amber-50 rounded-full px-4 h-8 text-xs font-bold transition-all"
      >
        <LogOut className="ml-2 h-3.5 w-3.5" />
        إنهاء المحاكاة
      </Button>
    </div>
  );
}
