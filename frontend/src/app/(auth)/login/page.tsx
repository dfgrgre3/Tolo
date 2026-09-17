import { Suspense } from "react";
import { Metadata } from "next";
import { LoaderCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Tolo",
  description: "سجل الدخول إلى حسابك في منصة Tolo التعليمية للوصول إلى كورساتك وامتحاناتك التفاعلية.",
};

export default function LoginPage() {
  return (
    <main className="relative flex w-full flex-1 items-center justify-center py-4 sm:py-8">
      <div className="relative w-full max-w-[460px]">
        <Suspense
          fallback={
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" role="status" aria-label="جاري التحميل">
              <LoaderCircle className="h-6 w-6 text-primary" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
