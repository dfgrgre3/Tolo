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
    <div className="w-full min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[460px] mx-auto">
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
    </div>
  );
}