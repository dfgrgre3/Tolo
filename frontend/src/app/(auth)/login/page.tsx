import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Tolo",
  description: "سجل الدخول إلى حسابك في منصة Tolo التعليمية للوصول إلى كورساتك وامتحاناتك التفاعلية.",
};

export default function LoginPage() {
  return (
    <main dir="rtl" className="relative isolate flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 end-0 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
      <div className="relative w-full max-w-[460px] mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
