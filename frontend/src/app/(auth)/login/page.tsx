import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Tolo",
  description: "سجل الدخول إلى حسابك في منصة Tolo التعليمية للوصول إلى كورساتك وامتحاناتك التفاعلية.",
};

export default function LoginPage() {
  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[460px] mx-auto">
        <LoginForm />
      </div>
    </div>
  );
}