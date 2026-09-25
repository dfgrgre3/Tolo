import { Suspense } from "react";
import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { SimpleSkeleton } from "@/components/ux/simple-skeleton";

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
            <SimpleSkeleton label="جاري تحميل صفحة تسجيل الدخول…" className="min-h-48" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
